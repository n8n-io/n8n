import { registerAs } from '@nestjs/config';

export interface ServerConfigType {
	host: string;
	port: number;
}

export default registerAs(
	'server',
	(): ServerConfigType => ({
		host: process.env.COMMAND_SERVICE_HOST ?? '127.0.0.1',
		port: parseInt(process.env.COMMAND_SERVICE_PORT ?? '5682', 10),
	}),
);
