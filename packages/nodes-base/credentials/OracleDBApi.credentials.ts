import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import oracledb from 'oracledb';

const privilegeKeys = [
	'SYSASM',
	'SYSBACKUP',
	'SYSDBA',
	'SYSDG',
	'SYSKM',
	'SYSOPER',
	'SYSPRELIM',
	'SYSRAC',
];

const privilegeOptions = privilegeKeys.map((key) => ({
	name: key,
	value: (oracledb as any)[key],
}));

export class OracleDBApi implements ICredentialType {
	name = 'oracleDBApi';

	displayName = 'Oracle Database Credentials API';

	documentationUrl = 'oracledb';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Connection String',
			name: 'connectionString',
			type: 'string',
			default: 'localhost/orcl',
			description: 'The Oracle database instance to connect to',
		},
		{
			displayName: 'Privilege',
			name: 'privilege',
			type: 'options',
			description: 'The privilege to use when connecting to the database',
			default: undefined,
			options: privilegeOptions,
		},
		{
			displayName: 'Use Optional Oracle Client Libraries',
			name: 'useThickMode',
			type: 'boolean',
			default: false,
			displayOptions: {
				hideOnCloud: true,
			},
			description: 'Define type of connection with database',
		},
		{
			displayName: 'Use SSL',
			name: 'useSSL',
			type: 'boolean',
			displayOptions: {
				show: {
					useThickMode: [false],
				},
			},
			default: false,
			description: 'SSL connection with database',
		},
		{
			displayName: 'Wallet Password',
			name: 'walletPassword',
			type: 'string',
			displayOptions: {
				show: {
					useThickMode: [false],
					useSSL: [true],
				},
			},
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'The password to decrypt the Privacy Enhanced Mail (PEM)-encoded private certificate, if it is encrypted',
		},
		{
			displayName: 'Wallet Content',
			name: 'walletContent',
			displayOptions: {
				show: {
					useThickMode: [false],
					useSSL: [true],
				},
			},
			type: 'string',
			default: '',
			description:
				'The security credentials required to establish a mutual TLS (mTLS) connection to Oracle Database',
		},
		{
			displayName: 'Distinguished Name',
			name: 'sslServerCertDN',
			type: 'string',
			displayOptions: {
				show: {
					useThickMode: [false],
					useSSL: [true],
				},
			},
			default: '',
			description: 'The distinguished name (DN) that should be matched with the certificate DN',
		},
		{
			displayName: 'Match Distinguished Name',
			name: 'sslServerDNMatch',
			type: 'boolean',
			default: true,
			displayOptions: {
				show: {
					useThickMode: [false],
					useSSL: [true],
				},
			},
			description:
				'Whether the server certificate DN should be matched in addition to the regular certificate verification that is performed',
		},
		{
			displayName: 'Allow Weak Distinguished Name Match',
			name: 'sslAllowWeakDNMatch',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					useThickMode: [false],
					useSSL: [true],
				},
			},
			description:
				'Whether the secure DN matching behavior which checks both the listener and server certificates has to be performed',
		},
		{
			displayName: 'Pool Min',
			name: 'poolMin',
			type: 'number',
			default: 0,
			description: 'The number of connections established to the database when a pool is created',
		},
		{
			displayName: 'Pool Max',
			name: 'poolMax',
			type: 'number',
			default: 4,
			description: 'The maximum number of connections to which a connection pool can grow',
		},
		{
			displayName: 'Pool Increment',
			name: 'poolIncrement',
			type: 'number',
			default: 1,
			description:
				'The number of connections that are opened whenever a connection request exceeds the number of currently open connections',
		},
		{
			displayName: 'Pool Maximum Session Life Time',
			name: 'maxLifetimeSession',
			type: 'number',
			default: 0,
			description:
				'The number of seconds that a pooled connection can exist in a pool after first being created',
		},
		{
			displayName: 'Pool Connection Idle Timeout',
			name: 'poolTimeout',
			type: 'number',
			default: 60,
			description:
				'The number of seconds after which idle connections (unused in the pool) may be terminated',
		},
		{
			displayName: 'Connection Class Name',
			name: 'connectionClass',
			type: 'string',
			default: '',
			description: 'DRCP/PRCP Connection Class',
		},
		{
			displayName: 'Connection Timeout',
			name: 'connectTimeout',
			type: 'number',
			default: 0,
			displayOptions: {
				show: {
					useThickMode: [false],
				},
			},
			description:
				'The timeout duration in seconds for an application to establish an Oracle Net connection',
		},
		{
			displayName: 'Transport Connection Timeout',
			name: 'transportConnectTimeout',
			type: 'number',
			default: 20,
			displayOptions: {
				show: {
					useThickMode: [false],
				},
			},
			description:
				'The maximum number of seconds to wait to establish a connection to the database host',
		},
		{
			displayName: 'Keepalive Probe Interval',
			name: 'expireTime',
			type: 'number',
			default: 0,
			displayOptions: {
				show: {
					useThickMode: [false],
				},
			},
			description: 'The number of minutes between the sending of keepalive probes',
			typeOptions: {
				minValue: 0,
			},
		},
	];
}
