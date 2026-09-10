import { Get, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { INSPECTOR_SCRIPT_SOURCE } from './inspector-script';

/**
 * Serves the element-picker script at a path outside `/apps`, so it can never
 * collide with `AppServingController`'s `/apps/:namespace{/*path}` wildcard.
 */
@RootLevelController('/')
export class AppInspectorScriptController {
	@Get('/apps-inspector.js', { skipAuth: true })
	serve(_req: Request, res: Response) {
		res.type('application/javascript').send(INSPECTOR_SCRIPT_SOURCE);
	}
}
