import { GlobalConfig } from '@n8n/config';
import cookieParser from 'cookie-parser';
import type { Application } from 'express';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Container from 'typedi';

import { rawBodyReader } from '@/middlewares';
import { setupRunnerHandler, setupRunnerServer } from '@/runners/runner-ws-server';

export interface TaskRunnerTestServer {
	app: Application;
	httpServer: Server;
	port: number;
}

/**
 * Sets up a task runner HTTP & WS server for testing purposes
 */
export const setupTaskRunnerTestServer = ({}): TaskRunnerTestServer => {
	const app = express();
	app.use(rawBodyReader);
	app.use(cookieParser());

	const testServer: TaskRunnerTestServer = {
		app,
		httpServer: app.listen(0),
		port: 0,
	};

	testServer.port = (testServer.httpServer.address() as AddressInfo).port;

	const globalConfig = Container.get(GlobalConfig);
	setupRunnerServer(globalConfig.endpoints.rest, testServer.httpServer, testServer.app);
	setupRunnerHandler(globalConfig.endpoints.rest, testServer.app);

	afterAll(async () => {
		testServer.httpServer.close();
	});

	return testServer;
};
