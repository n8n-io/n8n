import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CONFIG_DIR = path.join(os.homedir(), '.n8n-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface CliConfig {
	url?: string;
	apiKey?: string;
}

function ensureConfigDir(): void {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
	}
}

export function readConfig(): CliConfig {
	try {
		const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
		return JSON.parse(raw) as CliConfig;
	} catch {
		return {};
	}
}

export function writeConfig(config: CliConfig): void {
	ensureConfigDir();
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', {
		mode: 0o600,
	});
}

export function deleteConfig(): void {
	try {
		fs.unlinkSync(CONFIG_FILE);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
}

/** Resolve URL and API key from flags > env > config file */
export function resolveConnection(flags: {
	url?: string;
	apiKey?: string;
}): { url?: string; apiKey?: string } {
	const config = flags.url && flags.apiKey ? {} : readConfig();
	return {
		url: flags.url ?? process.env.N8N_URL ?? config.url,
		apiKey: flags.apiKey ?? process.env.N8N_API_KEY ?? config.apiKey,
	};
}
