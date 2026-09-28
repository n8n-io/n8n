import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import '@/zod-alias-support';

import { ImportCredentialsCommand } from '../credentials';

describe('ImportCredentialsCommand', () => {
	let inputDir: string;

	const buildCommand = () => {
		const command = new ImportCredentialsCommand();
		const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
		// @ts-expect-error Protected property
		command.logger = logger;
		return { command, logger };
	};

	/** What `export:credentials --backup` writes for one credential. */
	const credentialFile = (id: string) => ({
		id,
		name: `Credential ${id}`,
		data: 'U2FsdGVkX1+encrypted',
		type: 'httpHeaderAuth',
	});

	/** What `export:workflow --backup` writes for one workflow, into the same directory. */
	const workflowFile = (id: string) => ({
		id,
		name: `Workflow ${id}`,
		nodes: [],
		connections: {},
		active: false,
	});

	beforeEach(async () => {
		inputDir = await mkdtemp(join(tmpdir(), 'n8n-import-credentials-'));
	});

	afterEach(async () => {
		await rm(inputDir, { recursive: true, force: true });
	});

	const write = async (name: string, content: unknown) =>
		await writeFile(join(inputDir, name), JSON.stringify(content), 'utf8');

	const writeRaw = async (name: string, content: string) =>
		await writeFile(join(inputDir, name), content, 'utf8');

	describe('--separate', () => {
		it('skips a workflow file that sits in the same directory', async () => {
			await write('cred-1.json', credentialFile('cred-1'));
			await write('xbNcOFBmxn4eb05i.json', workflowFile('xbNcOFBmxn4eb05i'));
			const { command, logger } = buildCommand();

			// @ts-expect-error Private method
			const credentials = await command.readCredentials({ inputPath: inputDir, separate: true });

			expect(credentials).toHaveLength(1);
			expect(credentials[0]).toMatchObject({ id: 'cred-1', type: 'httpHeaderAuth' });
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Skipping invalid credential file'),
			);
		});

		it('reads a credential that `--decrypted` wrote as a data object', async () => {
			await write('cred-1.json', {
				...credentialFile('cred-1'),
				data: { name: 'X-Api-Key', value: 'secret' },
			});
			const { command, logger } = buildCommand();

			// @ts-expect-error Private method
			const credentials = await command.readCredentials({ inputPath: inputDir, separate: true });

			expect(credentials).toHaveLength(1);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it.each([
			['null data', null],
			['array data', []],
			['number data', 42],
		])('skips a file with %s that the insert cannot use', async (_label, data) => {
			await write('cred-1.json', credentialFile('cred-1'));
			await write('broken.json', { ...credentialFile('broken'), data });
			const { command, logger } = buildCommand();

			// @ts-expect-error Private method
			const credentials = await command.readCredentials({ inputPath: inputDir, separate: true });

			expect(credentials).toHaveLength(1);
			expect(credentials[0]).toMatchObject({ id: 'cred-1' });
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Skipping invalid credential file'),
			);
		});

		it('skips a malformed JSON file and imports the credentials beside it', async () => {
			await write('cred-1.json', credentialFile('cred-1'));
			await writeRaw('truncated.json', '{"type": "httpHeaderAuth", "data": "U2Fs');
			const { command, logger } = buildCommand();

			// @ts-expect-error Private method
			const credentials = await command.readCredentials({ inputPath: inputDir, separate: true });

			expect(credentials).toHaveLength(1);
			expect(credentials[0]).toMatchObject({ id: 'cred-1' });
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Skipping invalid credential file'),
			);
		});

		it('reads every credential file when the directory holds only credentials', async () => {
			await write('cred-1.json', credentialFile('cred-1'));
			await write('cred-2.json', credentialFile('cred-2'));
			const { command, logger } = buildCommand();

			// @ts-expect-error Private method
			const credentials = await command.readCredentials({ inputPath: inputDir, separate: true });

			expect(credentials).toHaveLength(2);
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});
});
