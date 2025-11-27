type AuthConfiguration = {
	tenantId?: string;
	clientId?: string;
	clientSecret?: string;
	certPemFile?: string;
	certKeyFile?: string;
	connectionName?: string;
	FICClientId?: string;
	authority?: string;
	scope?: string;
	issuers?: string[];
	altBlueprintConnectionName?: string;
	WIDAssertionFile?: string;
};

type ConnectionMapItem = { serviceUrl: string; connection: string };

type ConnectionsEnv = {
	connections: Map<string, AuthConfiguration>;
	connectionsMap: ConnectionMapItem[];
};

const logger = {
	debug: (...args: unknown[]) => console.debug('[authConfig]', ...args),
	warn: (...args: unknown[]) => console.warn('[authConfig]', ...args),
};

const DEFAULT_CONNECTION = 'serviceConnection';

/** Sets a deeply nested value in an object using dot notation */
function setDeepValue(obj: any, path: string, value: any): void {
	const keys = path.split('.');
	let current = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (typeof current[key] !== 'object' || current[key] === null) {
			current[key] = {};
		}
		current = current[key];
	}
	current[keys[keys.length - 1]] = value;
}

/** Loads the authentication configuration from a credentials object */
export function loadAuthConfigFromCredentials(
	credentials: Record<string, string | undefined>,
	connectionName?: string,
): AuthConfiguration & ConnectionsEnv {
	const envConnections = loadConnectionsMapFromCredentials(credentials);
	let authConfig: AuthConfiguration;

	if (envConnections.connectionsMap.length === 0) {
		authConfig = buildLegacyAuthConfig(credentials, connectionName);
		envConnections.connections.set(DEFAULT_CONNECTION, authConfig);
		envConnections.connectionsMap.push({ serviceUrl: '*', connection: DEFAULT_CONNECTION });
	} else {
		if (connectionName) {
			const entry = envConnections.connections.get(connectionName);
			if (!entry) throw new Error(`Connection "${connectionName}" not found in credentials.`);
			authConfig = entry;
		} else {
			const defaultItem = envConnections.connectionsMap.find((item) => item.serviceUrl === '*');
			const defaultConn = defaultItem
				? envConnections.connections.get(defaultItem.connection)
				: undefined;
			if (!defaultConn) throw new Error('No default connection found in credentials.');
			authConfig = defaultConn;
		}

		authConfig.authority ??= 'https://login.microsoftonline.com';
		authConfig.issuers ??= getDefaultIssuers(authConfig.tenantId ?? '', authConfig.authority);
	}

	return { ...authConfig, ...envConnections };
}

/** Loads configuration in the older MicrosoftApp* style */
export function loadPrevAuthConfigFromCredentials(
	credentials: Record<string, string | undefined>,
): AuthConfiguration & ConnectionsEnv {
	const envConnections = loadConnectionsMapFromCredentials(credentials);
	let authConfig: AuthConfiguration = {};

	if (envConnections.connectionsMap.length === 0) {
		if (!credentials.MicrosoftAppId) {
			throw new Error('ClientId is required when no connection map is provided.');
		}

		const authority = credentials.authorityEndpoint ?? 'https://login.microsoftonline.com';
		authConfig = {
			tenantId: credentials.MicrosoftAppTenantId,
			clientId: credentials.MicrosoftAppId,
			clientSecret: credentials.MicrosoftAppPassword,
			certPemFile: credentials.certPemFile,
			certKeyFile: credentials.certKeyFile,
			connectionName: credentials.connectionName,
			FICClientId: credentials.MicrosoftAppClientId,
			authority,
			scope: credentials.scope,
			issuers: getDefaultIssuers(credentials.MicrosoftAppTenantId ?? '', authority),
			altBlueprintConnectionName: credentials.altBlueprintConnectionName,
			WIDAssertionFile: credentials.WIDAssertionFile,
		};

		envConnections.connections.set(DEFAULT_CONNECTION, authConfig);
		envConnections.connectionsMap.push({ serviceUrl: '*', connection: DEFAULT_CONNECTION });
	} else {
		const defaultItem = envConnections.connectionsMap.find((item) => item.serviceUrl === '*');
		const defaultConn = defaultItem
			? envConnections.connections.get(defaultItem.connection)
			: undefined;
		if (!defaultConn) throw new Error('No default connection found in credentials.');
		authConfig = defaultConn;
	}

	authConfig.authority ??= 'https://login.microsoftonline.com';
	authConfig.issuers ??= getDefaultIssuers(authConfig.tenantId ?? '', authConfig.authority);

	return { ...authConfig, ...envConnections };
}

/** Merges provided config with defaults */
export function getAuthConfigWithDefaults(
	credentials: Record<string, string | undefined>,
	config?: Partial<AuthConfiguration> & Partial<ConnectionsEnv>,
): AuthConfiguration & ConnectionsEnv {
	if (!config) return loadAuthConfigFromCredentials(credentials);

	const providedConnections =
		config.connections && config.connectionsMap
			? { connections: config.connections, connectionsMap: config.connectionsMap }
			: undefined;

	const connections = providedConnections ?? loadConnectionsMapFromCredentials(credentials);
	let mergedConfig: AuthConfiguration;

	if (connections.connectionsMap.length === 0) {
		mergedConfig = buildLegacyAuthConfig(credentials, undefined, config);
		connections.connections.set(DEFAULT_CONNECTION, mergedConfig);
		connections.connectionsMap.push({ serviceUrl: '*', connection: DEFAULT_CONNECTION });
	} else {
		const defaultItem = connections.connectionsMap.find((item) => item.serviceUrl === '*');
		const defaultConn = defaultItem
			? connections.connections.get(defaultItem.connection)
			: undefined;
		if (!defaultConn) throw new Error('No default connection found in credentials.');
		mergedConfig = buildLegacyAuthConfig(credentials, undefined, defaultConn);
	}

	return { ...mergedConfig, ...connections };
}

/** Builds legacy-style authentication configuration */
function buildLegacyAuthConfig(
	credentials: Record<string, string | undefined>,
	envPrefix = '',
	customConfig?: Partial<AuthConfiguration>,
): AuthConfiguration {
	const prefix = envPrefix ? `${envPrefix}_` : '';
	const authority =
		customConfig?.authority ??
		credentials[`${prefix}authorityEndpoint`] ??
		'https://login.microsoftonline.com';
	const clientId = customConfig?.clientId ?? credentials[`${prefix}clientId`];

	if (!clientId) throw new Error(`ClientId not found for connection: ${envPrefix || 'default'}`);

	const tenantId = customConfig?.tenantId ?? credentials[`${prefix}tenantId`];

	return {
		tenantId,
		clientId,
		clientSecret: customConfig?.clientSecret ?? credentials[`${prefix}clientSecret`],
		certPemFile: customConfig?.certPemFile ?? credentials[`${prefix}certPemFile`],
		certKeyFile: customConfig?.certKeyFile ?? credentials[`${prefix}certKeyFile`],
		connectionName: customConfig?.connectionName ?? credentials[`${prefix}connectionName`],
		FICClientId: customConfig?.FICClientId ?? credentials[`${prefix}FICClientId`],
		authority,
		scope: customConfig?.scope ?? credentials[`${prefix}scope`],
		issuers: customConfig?.issuers ?? getDefaultIssuers(tenantId, authority),
		altBlueprintConnectionName:
			customConfig?.altBlueprintConnectionName ??
			credentials[`${prefix}altBlueprintConnectionName`],
		WIDAssertionFile: customConfig?.WIDAssertionFile ?? credentials[`${prefix}WIDAssertionFile`],
	};
}

/** Parses connections from credentials object */
function loadConnectionsMapFromCredentials(
	credentials: Record<string, string | undefined>,
): ConnectionsEnv {
	const connectionsObj: Record<string, any> = {};
	const connectionsMap: ConnectionMapItem[] = [];

	const CONNECTIONS_PREFIX = 'connections__';
	const CONNECTIONS_MAP_PREFIX = 'connectionsMap__';

	for (const [key, value] of Object.entries(credentials)) {
		if (key.startsWith(CONNECTIONS_PREFIX)) {
			const path = key
				.substring(CONNECTIONS_PREFIX.length)
				.replace(/__/g, '.')
				.replace('.settings.', '.');
			setDeepValue(connectionsObj, path, value);
		} else if (key.startsWith(CONNECTIONS_MAP_PREFIX)) {
			const path = key.substring(CONNECTIONS_MAP_PREFIX.length).replace(/__/g, '.');
			setDeepValue(connectionsMap, path, value);
		}
	}

	const connections = new Map<string, AuthConfiguration>(
		Object.entries(connectionsObj as Record<string, AuthConfiguration>),
	);

	if (connections.size === 0) logger.warn('No connections found in credentials.');
	if (connectionsMap.length === 0) {
		logger.warn('No connections map found in credentials.');
		const firstEntry = connections.entries().next().value;
		if (firstEntry) {
			const [firstKey] = firstEntry;
			connectionsMap.push({ serviceUrl: '*', connection: firstKey });
		}
	}

	return { connections, connectionsMap };
}

/** Default issuer URLs */
function getDefaultIssuers(tenantId?: string, authority?: string): string[] {
	return [
		'https://api.botframework.com',
		`https://sts.windows.net/${tenantId}/`,
		`${authority}/${tenantId}/v2.0`,
	];
}
