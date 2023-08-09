/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/naming-convention */
import type { Application } from 'express';
import type { DataSource } from 'typeorm';
import config from '@/config';
import type { RedisOptions } from 'ioredis';
import Redis from 'ioredis';
import { entities } from '../databases/entities';
import type { IncidentHandlerOptions } from '@deep-consulting-solutions/incident-handling';
import incidentHandler from '@deep-consulting-solutions/incident-handling';
import { getConnection } from '@/Db';

export const enum DCSEnvEnum {
	DEV = 'dev',
	PROD = 'production',
	STAGING = 'staging',
	TESTING = 'test',
}

export const getIncidentHandlerConfig = ({
	app,
	connection,
}: {
	app: Application;
	connection: DataSource;
}): IncidentHandlerOptions => {
	const { host, port, username, password, db }: RedisOptions = config.getEnv('queue.bull.redis');
	const redis = new Redis({
		host,
		port,
		db,
		username,
		password,
	});

	let ticketBlueprintTransitions: unknown[] = [];
	try {
		ticketBlueprintTransitions = JSON.parse(
			process.env.INCIDENT_HANDLING_DESK_TICKET_RESOLUTION_BLUEPRINTS as string,
		) as unknown[];
	} catch (e) {}

	return {
		app,
		projectName: 'N8N',
		connection,
		entities: {
			ServerIncident: entities.ServerIncident,
			DataRecoveryActivity: entities.DataRecoveryActivity,
		},
		redis,
		zoho: {
			desk: {
				config: {
					accountsUrl: process.env.ZOHO_ACCOUNTS_BASE_URL || '',
					clientId: process.env.ZOHO_DESK_MONITORING_CLIENT_ID || '',
					clientSecret: process.env.ZOHO_DESK_MONITORING_CLIENT_SECRET || '',
					refreshToken: process.env.ZOHO_DESK_MONITORING_REFRESH_TOKEN || '',
					apiUrl: process.env.ZOHO_DESK_MONITORING_DEPARTMENT_URL || '',
					orgId: process.env.ZOHO_DESK_MONITORING_ORG_ID || '',
					monitoringDepartmentId:
						(process.env.DCS_ENV === DCSEnvEnum.PROD
							? process.env.DCS_ZOHO_DESK_ABNORMAL_USAGE_DEPARTMENT_ID
							: process.env.DCS_ZOHO_DESK_IT_ALERTS_TEST_DEPARTMENT_ID) || '',
					monitoringDepartmentEmail: process.env.ZOHO_DESK_MONITORING_DEPARTMENT_EMAIL || '',
				},
				ticketBlueprintTransitions: ticketBlueprintTransitions as never,
			},
			crm: {
				config: {
					accountsUrl: process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com',
					clientId: process.env.ZOHO_CLIENT_ID || '',
					clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
					refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
					dataRecoveryConfig: [],
					apiUrl: `${process.env.ZOHO_CRM_BASE_URL || 'https://www.zohoapis.com/crm'}/v2`,
				},
			},
		},
	};
};

export const setupReusablesAndRoutes = async (app: Application) => {
	const connection = getConnection();
	await incidentHandler.setup(getIncidentHandlerConfig({ app, connection }));
};
