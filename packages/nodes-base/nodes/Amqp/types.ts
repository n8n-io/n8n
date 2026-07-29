export type AmqpCredential = {
	hostname: string;
	port: number;
	username?: string;
	password?: string;
	transportType?: 'tcp' | 'tls';
};
