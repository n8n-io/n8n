import { Driver } from './Driver';
import { hash, shorten } from '../util/StringUtils';
import { VersionUtils } from '../util/VersionUtils';

/**
 * Common driver utility functions.
 */
export class DriverUtils {
	// -------------------------------------------------------------------------
	// Public Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Returns true if given driver is SQLite-based driver.
	 */
	static isSQLiteFamily(driver: Driver): boolean {
		return [
			'sqlite',
			'sqlite-pooled',
			'cordova',
			'react-native',
			'nativescript',
			'sqljs',
			'expo',
			'better-sqlite3',
			'capacitor',
			'libsql',
		].includes(driver.options.type);
	}

	static isReleaseVersionOrGreater(driver: Driver, version: string): boolean {
		return driver.version != null && VersionUtils.isGreaterOrEqual(driver.version, version);
	}

	static isPostgresFamily(driver: Driver): boolean {
		return ['postgres', 'aurora-postgres', 'cockroachdb'].includes(driver.options.type);
	}

	/**
	 * Normalizes and builds a new driver options.
	 * Extracts settings from connection url and sets to a new options object.
	 */
	static buildDriverOptions(options: any, buildOptions?: { useSid: boolean }): any {
		if (options.url) {
			const urlDriverOptions = this.parseConnectionUrl(options.url) as {
				[key: string]: any;
			};

			if (buildOptions && buildOptions.useSid && urlDriverOptions.database) {
				urlDriverOptions.sid = urlDriverOptions.database;
			}

			for (const key of Object.keys(urlDriverOptions)) {
				if (typeof urlDriverOptions[key] === 'undefined') {
					delete urlDriverOptions[key];
				}
			}

			return Object.assign({}, options, urlDriverOptions);
		}
		return Object.assign({}, options);
	}

	/**
	 * buildDriverOptions for MongodDB only to support replica set
	 */
	static buildMongoDBDriverOptions(options: any, buildOptions?: { useSid: boolean }): any {
		if (options.url) {
			const urlDriverOptions = this.parseMongoDBConnectionUrl(options.url) as {
				[key: string]: any;
			};

			if (buildOptions && buildOptions.useSid && urlDriverOptions.database) {
				urlDriverOptions.sid = urlDriverOptions.database;
			}

			for (const key of Object.keys(urlDriverOptions)) {
				if (typeof urlDriverOptions[key] === 'undefined') {
					delete urlDriverOptions[key];
				}
			}

			return Object.assign({}, options, urlDriverOptions);
		}
		return Object.assign({}, options);
	}

	/**
	 * Joins and shortens alias if needed.
	 *
	 * If the alias length is greater than the limit allowed by the current
	 * driver, replaces it with a shortend string, if the shortend string
	 * is still too long, it will then hash the alias.
	 *
	 * @param driver Current `Driver`.
	 * @param buildOptions Optional settings.
	 * @param alias Alias parts.
	 *
	 * @return An alias that is no longer than the divers max alias length.
	 */
	static buildAlias(
		{ maxAliasLength }: Driver,
		buildOptions: { shorten?: boolean; joiner?: string } | undefined,
		...alias: string[]
	): string {
		const joiner = buildOptions && buildOptions.joiner ? buildOptions.joiner : '_';

		let newAlias = alias.length === 1 ? alias[0] : alias.join(joiner);

		if (maxAliasLength && maxAliasLength > 0 && newAlias.length > maxAliasLength) {
			if (buildOptions && buildOptions.shorten === true) {
				const shortenedAlias = shorten(newAlias);
				if (shortenedAlias.length < maxAliasLength) {
					return shortenedAlias;
				}
			}

			return hash(newAlias, { length: maxAliasLength });
		}

		return newAlias;
	}

	/**
	 * @deprecated use `buildAlias` instead.
	 */
	static buildColumnAlias(
		{ maxAliasLength }: Driver,
		buildOptions: { shorten?: boolean; joiner?: string } | string,
		...alias: string[]
	) {
		if (typeof buildOptions === 'string') {
			alias.unshift(buildOptions);
			buildOptions = { shorten: false, joiner: '_' };
		} else {
			buildOptions = Object.assign({ shorten: false, joiner: '_' }, buildOptions);
		}
		return this.buildAlias({ maxAliasLength } as Driver, buildOptions, ...alias);
	}

	// -------------------------------------------------------------------------
	// Private Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Extracts connection data from the connection url.
	 */
	private static parseConnectionUrl(url: string) {
		const type = url.split(':')[0];
		const firstSlashes = url.indexOf('//');
		const preBase = url.substr(firstSlashes + 2);
		const secondSlash = preBase.indexOf('/');
		const base = secondSlash !== -1 ? preBase.substr(0, secondSlash) : preBase;
		let afterBase = secondSlash !== -1 ? preBase.substr(secondSlash + 1) : undefined;
		// remove mongodb query params
		if (afterBase && afterBase.indexOf('?') !== -1) {
			afterBase = afterBase.substr(0, afterBase.indexOf('?'));
		}

		const lastAtSign = base.lastIndexOf('@');
		const usernameAndPassword = base.substr(0, lastAtSign);
		const hostAndPort = base.substr(lastAtSign + 1);

		let username = usernameAndPassword;
		let password = '';
		const firstColon = usernameAndPassword.indexOf(':');
		if (firstColon !== -1) {
			username = usernameAndPassword.substr(0, firstColon);
			password = usernameAndPassword.substr(firstColon + 1);
		}
		const [host, port] = hostAndPort.split(':');

		return {
			type: type,
			host: host,
			username: decodeURIComponent(username),
			password: decodeURIComponent(password),
			port: port ? parseInt(port) : undefined,
			database: afterBase || undefined,
		};
	}

	/**
	 * Extracts connection data from the connection url for MongoDB to support replica set.
	 */
	private static parseMongoDBConnectionUrl(url: string) {
		const type = url.split(':')[0];
		const firstSlashes = url.indexOf('//');
		const preBase = url.substr(firstSlashes + 2);
		const secondSlash = preBase.indexOf('/');
		const base = secondSlash !== -1 ? preBase.substr(0, secondSlash) : preBase;
		let afterBase = secondSlash !== -1 ? preBase.substr(secondSlash + 1) : undefined;
		let afterQuestionMark = '';
		let host = undefined;
		let port = undefined;
		let hostReplicaSet = undefined;
		let replicaSet = undefined;

		let optionsObject: any = {};

		if (afterBase && afterBase.indexOf('?') !== -1) {
			// split params
			afterQuestionMark = afterBase.substr(afterBase.indexOf('?') + 1, afterBase.length);

			const optionsList = afterQuestionMark.split('&');
			let optionKey: string;
			let optionValue: string;

			// create optionsObject for merge with connectionUrl object before return
			optionsList.forEach((optionItem) => {
				optionKey = optionItem.split('=')[0];
				optionValue = optionItem.split('=')[1];
				optionsObject[optionKey] = optionValue;
			});

			// specific replicaSet value to set options about hostReplicaSet
			replicaSet = optionsObject['replicaSet'];
			afterBase = afterBase.substr(0, afterBase.indexOf('?'));
		}

		const lastAtSign = base.lastIndexOf('@');
		const usernameAndPassword = base.substr(0, lastAtSign);
		const hostAndPort = base.substr(lastAtSign + 1);

		let username = usernameAndPassword;
		let password = '';
		const firstColon = usernameAndPassword.indexOf(':');
		if (firstColon !== -1) {
			username = usernameAndPassword.substr(0, firstColon);
			password = usernameAndPassword.substr(firstColon + 1);
		}

		// If replicaSet have value set It as hostlist, If not set like standalone host
		if (replicaSet) {
			hostReplicaSet = hostAndPort;
		} else {
			[host, port] = hostAndPort.split(':');
		}

		let connectionUrl: any = {
			type: type,
			host: host,
			hostReplicaSet: hostReplicaSet,
			username: decodeURIComponent(username),
			password: decodeURIComponent(password),
			port: port ? parseInt(port) : undefined,
			database: afterBase || undefined,
		};

		// Loop to set every options in connectionUrl to object
		for (const [key, value] of Object.entries(optionsObject)) {
			connectionUrl[key] = value;
		}

		return connectionUrl;
	}
}
