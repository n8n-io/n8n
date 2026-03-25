require('dotenv').config();
import { describe, expect } from '@jest/globals';
import InfisicalClient from '../../src';

describe('InfisicalClient', () => {
    let client: InfisicalClient;
    beforeAll(async () => {
        client = new InfisicalClient({
            token: process.env.INFISICAL_TOKEN!,
            siteURL: process.env.SITE_URL!,
            debug: true
        });

        await client.createSecret('KEY_ONE', 'KEY_ONE_VAL');
        await client.createSecret('KEY_ONE', 'KEY_ONE_VAL_PERSONAL', {
            type: "personal",
            environment: "dev",
            path: "/"
        });
        await client.createSecret('KEY_TWO', 'KEY_TWO_VAL');
    });

    afterAll(async () => {
        await client.deleteSecret('KEY_ONE');
        await client.deleteSecret('KEY_TWO');
        await client.deleteSecret('KEY_THREE');
    });

    it('get overriden personal secret', async () => {
        const secret = await client.getSecret('KEY_ONE', { 
            type: "personal",
            environment: "dev",
            path: "/"
        });

        expect(secret.secretName).toBe('KEY_ONE');
        expect(secret.secretValue).toBe('KEY_ONE_VAL_PERSONAL');
        expect(secret.type).toBe('personal');
    });

    it('get shared secret specified', async () => {
        const secret = await client.getSecret('KEY_ONE', { 
            type: 'shared',
            environment: "dev",
            path: "/"
        });

        expect(secret.secretName).toBe('KEY_ONE');
        expect(secret.secretValue).toBe('KEY_ONE_VAL');
        expect(secret.type).toBe('shared');
    });

    it('get shared secret', async () => {
        const secret = await client.getSecret('KEY_TWO');

        expect(secret.secretName).toBe('KEY_TWO');
        expect(secret.secretValue).toBe('KEY_TWO_VAL');
        expect(secret.type).toBe('shared');
    });

    it('create shared secret', async () => {
        const secret = await client.createSecret('KEY_THREE', 'KEY_THREE_VAL');

        expect(secret.secretName).toBe('KEY_THREE');
        expect(secret.secretValue).toBe('KEY_THREE_VAL');
        expect(secret.type).toBe('shared');
    });

    it('create personal secret', async () => {
        await client.createSecret('KEY_FOUR', 'KEY_FOUR_VAL');
        const secretPersonal = await client.createSecret('KEY_FOUR', 'KEY_FOUR_VAL_PERSONAL', {
            type: "personal",
            environment: "dev",
            path: "/"
        });

        expect(secretPersonal.secretName).toBe('KEY_FOUR');
        expect(secretPersonal.secretValue).toBe('KEY_FOUR_VAL_PERSONAL');
        expect(secretPersonal.type).toBe('personal');
    });

    it('update shared secret', async () => {
        const secret = await client.updateSecret('KEY_THREE', 'FOO');

        expect(secret.secretName).toBe('KEY_THREE');
        expect(secret.secretValue).toBe('FOO');
        expect(secret.type).toBe('shared');
    });

    it('update personal secret', async () => {
        const secret = await client.updateSecret('KEY_FOUR', 'BAR', {
            type: "personal",
            environment: "dev",
            path: "/"
        });

        expect(secret.secretName).toBe('KEY_FOUR');
        expect(secret.secretValue).toBe('BAR');
        expect(secret.type).toBe('personal');
    });

    it('delete personal secret', async () => {
        const secret = await client.deleteSecret('KEY_FOUR', {
            type: "personal",
            environment: "dev",
            path: "/"
        });

        expect(secret.secretName).toBe('KEY_FOUR');
        expect(secret.secretValue).toBe('BAR');
        expect(secret.type).toBe('personal');
    });

    it('delete shared secret', async () => {
        const secret = await client.deleteSecret('KEY_FOUR');

        expect(secret.secretName).toBe('KEY_FOUR');
        expect(secret.secretValue).toBe('KEY_FOUR_VAL');
        expect(secret.type).toBe('shared');
    });

    it('encrypt/decrypt symmetric', () => {
        const plaintext = 'The quick brown fox jumps over the lazy dog';

        const key = client.createSymmetricKey();

        const {
            ciphertext,
            iv,
            tag
        } = client.encryptSymmetric(plaintext, key);

        const cleartext = client.decryptSymmetric(
            ciphertext,
            key,
            iv,
            tag
        );

        expect(plaintext).toBe(cleartext);
    });
});