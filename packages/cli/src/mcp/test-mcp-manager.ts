import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

@Service()
export class TestMCPManager {
	handleRequest(req: Request, res: Response) {
		console.log('hello');
	}
}
