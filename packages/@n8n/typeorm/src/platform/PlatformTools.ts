import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';

export { ReadStream } from 'fs';

/**
 * Platform-specific tools.
 */
export class PlatformTools {
	/**
	 * Normalizes given path. Does "path.normalize" and replaces backslashes with forward slashes on Windows.
	 */
	static pathNormalize(pathStr: string): string {
		let normalizedPath = path.normalize(pathStr);
		if (process.platform === 'win32') normalizedPath = normalizedPath.replace(/\\/g, '/');
		return normalizedPath;
	}

	/**
	 * Gets file extension. Does "path.extname".
	 */
	static pathExtname(pathStr: string): string {
		return path.extname(pathStr);
	}

	/**
	 * Resolved given path. Does "path.resolve".
	 */
	static pathResolve(pathStr: string): string {
		return path.resolve(pathStr);
	}

	/**
	 * Synchronously checks if file exist. Does "fs.existsSync".
	 */
	static fileExist(pathStr: string): boolean {
		return fs.existsSync(pathStr);
	}

	static readFileSync(filename: string): Buffer {
		return fs.readFileSync(filename);
	}

	static appendFileSync(filename: string, data: any): void {
		fs.appendFileSync(filename, data);
	}

	static async writeFile(path: string, data: any): Promise<void> {
		return new Promise<void>((ok, fail) => {
			fs.writeFile(path, data, (err) => {
				if (err) fail(err);
				ok();
			});
		});
	}

	/**
	 * Loads a dotenv file into the environment variables.
	 *
	 * @param path The file to load as a dotenv configuration
	 */
	static dotenv(pathStr: string): void {
		dotenv.config({ path: pathStr });
	}

	/**
	 * Gets environment variable.
	 */
	static getEnvVariable(name: string): any {
		return process.env[name];
	}

	/**
	 * Logging functions needed by AdvancedConsoleLogger
	 */
	static logInfo(prefix: string, info: any) {
		console.log(chalk.gray.underline(prefix), info);
	}

	static logError(prefix: string, error: any) {
		console.log(chalk.underline.red(prefix), error);
	}

	static logWarn(prefix: string, warning: any) {
		console.log(chalk.underline.yellow(prefix), warning);
	}

	static log(message: string) {
		console.log(chalk.underline(message));
	}

	static info(info: any) {
		return chalk.gray(info);
	}

	static error(error: any) {
		return chalk.red(error);
	}

	static warn(message: string) {
		return chalk.yellow(message);
	}

	static logCmdErr(prefix: string, err?: any) {
		console.log(chalk.black.bgRed(prefix));
		if (err) console.error(err);
	}
}
