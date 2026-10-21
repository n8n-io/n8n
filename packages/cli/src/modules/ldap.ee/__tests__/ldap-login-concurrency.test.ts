import { mockLogger } from '@n8n/backend-test-utils';
import { LDAP_DEFAULT_CONFIGURATION } from '@n8n/constants';
import { BerReader, BerWriter, FilterParser, ProtocolOperation } from 'ldapts';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import tls from 'node:tls';
import { mock } from 'vitest-mock-extended';

import { LdapService } from '../ldap.service.ee';

describe('LDAP login concurrency (IAM-1526)', () => {
	const users = [
		{ dn: 'uid=alice,dc=example,dc=com', uid: 'alice', mail: 'alice@example.com' },
		{ dn: 'uid=bob,dc=example,dc=com', uid: 'bob', mail: 'bob@example.com' },
	];
	const ldapConfig = {
		...LDAP_DEFAULT_CONFIGURATION,
		connectionUrl: 'ldap.example.com',
		connectionPort: 636,
		connectionSecurity: 'tls' as const,
		baseDn: 'dc=example,dc=com',
		bindingAdminDn: 'cn=admin,dc=example,dc=com',
		bindingAdminPassword: 'admin-password',
		loginIdAttribute: 'uid',
		ldapIdAttribute: 'uid',
		emailAttribute: 'mail',
		firstNameAttribute: 'givenName',
		lastNameAttribute: 'sn',
		synchronizationEnabled: false,
	};
	let ldapService: LdapService;
	let sockets: tls.TLSSocket[];

	const response = (
		messageId: number,
		operation: number,
		writeBody: (writer: BerWriter) => void,
	) => {
		const writer = new BerWriter();
		writer.startSequence();
		writer.writeInt(messageId);
		writer.startSequence(operation);
		writeBody(writer);
		writer.endSequence();
		writer.endSequence();
		return writer.buffer;
	};

	const success = (writer: BerWriter) => {
		writer.writeEnumeration(0);
		writer.writeString('');
		writer.writeString('');
	};

	const createSocket = () => {
		const socket = new EventEmitter() as tls.TLSSocket;
		sockets.push(socket);
		socket.end = vi.fn(() => socket);
		socket.destroy = vi.fn(() => {
			queueMicrotask(() => socket.emit('close'));
			return socket;
		});
		socket.write = vi.fn((buffer: Buffer, callback: () => void) => {
			const reader = new BerReader(buffer);
			reader.readSequence();
			const messageId = reader.readInt()!;
			const operation = reader.readSequence();

			queueMicrotask(() => {
				callback();
				if (operation === ProtocolOperation.LDAP_REQ_BIND) {
					socket.emit('data', response(messageId, ProtocolOperation.LDAP_RES_BIND, success));
				} else if (operation === ProtocolOperation.LDAP_REQ_SEARCH) {
					reader.readString(); // Search base.
					reader.readEnumeration(); // Scope.
					reader.readEnumeration(); // Alias policy.
					reader.readInt(); // Size limit.
					reader.readInt(); // Time limit.
					reader.readBoolean(); // Attribute values.
					const filter = FilterParser.parse(reader).toString();
					const user = users.find(({ uid }) => filter.includes(`(uid=${uid})`));
					if (user) {
						socket.emit(
							'data',
							response(messageId, ProtocolOperation.LDAP_RES_SEARCH_ENTRY, (writer) => {
								writer.writeString(user.dn);
								writer.startSequence();
								for (const [attribute, value] of Object.entries(user)) {
									if (attribute === 'dn') continue;
									writer.startSequence();
									writer.writeString(attribute);
									writer.startSequence(ProtocolOperation.LBER_SET);
									writer.writeString(value);
									writer.endSequence();
									writer.endSequence();
								}
								writer.endSequence();
							}),
						);
					}
					socket.emit('data', response(messageId, ProtocolOperation.LDAP_RES_SEARCH, success));
				}
			});
			return true;
		});

		// Deliver both connection events after both concurrent logins start to connect.
		queueMicrotask(() => socket.emit('secureConnect'));
		return socket;
	};

	const login = async (user: (typeof users)[number]) =>
		await ldapService.findAndAuthenticateLdapUser(
			user.uid,
			'user-password',
			ldapConfig.loginIdAttribute,
			ldapConfig.userFilter,
		);

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		sockets = [];
		vi.spyOn(tls, 'connect').mockImplementation(createSocket);
		// ldapts imports the Node.js TLS module through its ESM entry point.
		syncBuiltinESMExports();
		ldapService = new LdapService(mockLogger(), mock(), mock(), mock(), mock());
		ldapService.setConfig(ldapConfig);
	});

	afterEach(() => {
		for (const socket of sockets) socket.destroy();
		vi.restoreAllMocks();
		syncBuiltinESMExports();
		vi.useRealTimers();
	});

	it('should authenticate sequential LDAP logins', async () => {
		for (const user of users) {
			await expect(login(user)).resolves.toMatchObject(user);
		}
	});

	it('should complete concurrent LDAP logins before the gateway timeout', async () => {
		// IAM-1526: Warm the cached client before different users log in together.
		for (const user of users) {
			await expect(login(user)).resolves.toMatchObject(user);
		}

		const logins = users.map(
			async (user) =>
				await Promise.race([
					login(user),
					new Promise<string>((resolve) => setTimeout(() => resolve('gateway timeout'), 60_000)),
				]),
		);
		await vi.advanceTimersByTimeAsync(60_000);

		await expect(Promise.all(logins)).resolves.toMatchObject(users);
	});
});
