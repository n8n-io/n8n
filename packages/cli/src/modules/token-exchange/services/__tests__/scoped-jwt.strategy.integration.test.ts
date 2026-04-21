import { testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { createMember, createOwner } from '@test-integration/db/users';

import { JwtService } from '@/services/jwt.service';

import { TOKEN_EXCHANGE_ISSUER } from '../../token-exchange.types';
import { ScopedJwtStrategy } from '../scoped-jwt.strategy';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

function makeBearerReq(token: string): AuthenticatedRequest {
	const req = mock<AuthenticatedRequest>();
	req.headers = { authorization: `Bearer ${token}` } as unknown as AuthenticatedRequest['headers'];
	return req;
}

function makeApiKeyReq(token: string): AuthenticatedRequest {
	const req = mock<AuthenticatedRequest>();
	req.headers = { 'x-n8n-api-key': token } as unknown as AuthenticatedRequest['headers'];
	return req;
}

function makeScopedJwt(sub: string, actSub?: string): string {
	return jwtService.sign({
		iss: TOKEN_EXCHANGE_ISSUER,
		sub,
		...(actSub && { act: { sub: actSub } }),
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		jti: 'test-jti',
	});
}

describe('ScopedJwtStrategy (integration)', () => {
	let strategy: ScopedJwtStrategy;

	beforeAll(async () => {
		await testDb.init();
		strategy = new ScopedJwtStrategy(jwtService, Container.get(UserRepository));
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('returns null for a token with a non-token-exchange issuer', async () => {
		const token = jwtService.sign({ iss: 'n8n', sub: '123' });
		expect(await strategy.authenticate(makeBearerReq(token))).toBeNull();
	});

	it('returns false when subject user does not exist in DB', async () => {
		const token = makeScopedJwt('422b72e6-2df2-47c9-8082-f8393b088fde');
		expect(await strategy.authenticate(makeBearerReq(token))).toBe(false);
	});

	it('sets req.user to subject and loads subject role scopes when no act claim', async () => {
		const owner = await createOwner();
		const ownerWithRole = await Container.get(UserRepository).findOne({
			where: { id: owner.id },
			relations: { role: true },
		});
		const expectedScopes = ownerWithRole!.role.scopes.map((s) => s.slug);

		const token = makeScopedJwt(owner.id);
		const req = makeBearerReq(token);

		expect(await strategy.authenticate(req)).toBe(true);

		expect(req.user.id).toBe(owner.id);
		expect(req.tokenGrant?.subject.id).toBe(owner.id);
		expect(req.tokenGrant?.actor).toBeUndefined();
		expect(req.tokenGrant?.scopes).toEqual(expect.arrayContaining(expectedScopes));
		expect(req.tokenGrant?.scopes).toHaveLength(expectedScopes.length);
	});

	it('sets req.user to actor and uses actor scopes when act claim resolves', async () => {
		const subject = await createOwner();
		const actor = await createMember();
		const token = makeScopedJwt(subject.id, actor.id);
		const req = makeBearerReq(token);

		expect(await strategy.authenticate(req)).toBe(true);

		expect(req.user.id).toBe(actor.id);
		expect(req.tokenGrant?.subject.id).toBe(subject.id);
		expect(req.tokenGrant?.actor?.id).toBe(actor.id);

		const actorWithRole = await Container.get(UserRepository).findOne({
			where: { id: actor.id },
			relations: { role: true },
		});
		const actorScopes = actorWithRole!.role.scopes.map((s) => s.slug);
		expect(req.tokenGrant?.scopes).toEqual(expect.arrayContaining(actorScopes));
		expect(req.tokenGrant?.scopes).toHaveLength(actorScopes.length);
	});

	it('continues without actor and uses subject scopes when actor ID is not in DB', async () => {
		const subject = await createOwner();
		const token = makeScopedJwt(subject.id, 'b4439ae8-4c33-4aac-9bc0-ff1891b03e13');
		const req = makeBearerReq(token);

		expect(await strategy.authenticate(req)).toBe(true);

		expect(req.user.id).toBe(subject.id);
		expect(req.tokenGrant?.actor).toBeUndefined();

		const subjectWithRole = await Container.get(UserRepository).findOne({
			where: { id: subject.id },
			relations: { role: true },
		});
		const subjectScopes = subjectWithRole!.role.scopes.map((s) => s.slug);
		expect(req.tokenGrant?.scopes).toEqual(expect.arrayContaining(subjectScopes));
		expect(req.tokenGrant?.scopes).toHaveLength(subjectScopes.length);
	});

	it('accepts token from x-n8n-api-key header', async () => {
		const owner = await createOwner();
		const token = makeScopedJwt(owner.id);
		const req = makeApiKeyReq(token);

		expect(await strategy.authenticate(req)).toBe(true);
		expect(req.user.id).toBe(owner.id);
	});

	it('returns false when subject is disabled', async () => {
		const owner = await createOwner();
		await Container.get(UserRepository).update({ id: owner.id }, { disabled: true });
		const token = makeScopedJwt(owner.id);

		expect(await strategy.authenticate(makeBearerReq(token))).toBe(false);
	});

	it('returns false when actor is disabled', async () => {
		const subject = await createOwner();
		const actor = await createMember();
		await Container.get(UserRepository).update({ id: actor.id }, { disabled: true });
		const token = makeScopedJwt(subject.id, actor.id);

		expect(await strategy.authenticate(makeBearerReq(token))).toBe(false);
	});
});
