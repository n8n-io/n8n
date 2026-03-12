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

/** Resolve the n8n instance URL from flag > env > config file */
export function resolveUrl(flag?: string): string | undefined {
	return flag ?? process.env.N8N_URL ?? readConfig().url;
}

/** Resolve the API key from flag > env > config file */
export function resolveApiKey(flag?: string): string | undefined {
	return flag ?? process.env.N8N_API_KEY ?? readConfig().apiKey;
}
