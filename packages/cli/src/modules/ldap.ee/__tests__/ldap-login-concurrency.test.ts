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

	const createSocket = (connect = true) => {
		const socket = new EventEmitter() as tls.TLSSocket;
		sockets.push(socket);
		socket.end = vi.fn(() => socket);
		socket.destroy = vi.fn(() => {
			queueMicrotask(() => socket.emit('close'));
			return socket;
		});
		socket.write = vi.fn(
			(
				buffer: string | Uint8Array,
				encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
				callback?: (error?: Error | null) => void,
			) => {
				const reader = new BerReader(
					typeof buffer === 'string'
						? Buffer.from(
								buffer,
								typeof encodingOrCallback === 'string' ? encodingOrCallback : 'utf8',
							)
						: Buffer.from(buffer),
				);
				const onWrite = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
				reader.readSequence();
				const messageId = reader.readInt()!;
				const operation = reader.readSequence();

				queueMicrotask(() => {
					onWrite?.();
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
			},
		);

		// Deliver both connection events after both concurrent logins start to connect.
		if (connect) queueMicrotask(() => socket.emit('secureConnect'));
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
		vi.spyOn(tls, 'connect').mockImplementation(() => createSocket());
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

	it.each(['connection', 'bind'])(
		'should time out a stalled %s and allow later logins',
		async (stage) => {
			vi.mocked(tls.connect).mockImplementation(() => {
				const socket = createSocket(stage !== 'connection');
				if (stage === 'bind') socket.write = vi.fn(() => true);
				return socket;
			});

			const stalledLogin = login(users[0]);
			await vi.advanceTimersByTimeAsync(ldapConfig.searchTimeout * 1000);

			await expect(stalledLogin).resolves.toBeUndefined();
			expect(sockets[0].destroy).toHaveBeenCalled();

			vi.mocked(tls.connect).mockImplementation(() => createSocket());
			await expect(login(users[1])).resolves.toMatchObject(users[1]);
		},
	);
});
