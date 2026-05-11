import express, { type Application } from 'express';

export function createEngineServer(): { app: Application } {
	const app = express();

	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	return { app };
}
