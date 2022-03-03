import express = require('express');

import { ResponseHelper } from '../../../..';

export = {
	// the express handler implementation for ping
	createUsers: (req: express.Request, res: express.Response) => {
		console.log('Se llamo get users');
		ResponseHelper.sendSuccessResponse(res, {}, true, 204);
	},
	deleteUser: (req: express.Request, res: express.Response) => {
		console.log('Se llamo get users');
		ResponseHelper.sendSuccessResponse(res, {}, true, 204);
	},
	getUser: (req: express.Request, res: express.Response) => {
		console.log('Se llamo get users');
		ResponseHelper.sendSuccessResponse(res, {}, true, 204);
	},
	getUsers: (req: express.Request, res: express.Response) => {
		console.log('Se llamo get users');
		ResponseHelper.sendSuccessResponse(res, {}, true, 204);
	},
}; 
