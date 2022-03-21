import express = require('express');

import { UserRequest } from '../../../../requests';

export = {
	createUsers: async (req: UserRequest.Invite, res: express.Response) => {
		res.json({ success: true});
	},
	deleteUser: async (req: UserRequest.Delete, res: express.Response) => {
		console.log('aja')
		res.json({ success: true });
	},
	getUser: async (req: UserRequest.Get, res: express.Response) => {
		res.json({ success: true });
	},
	getUsers: async (req: UserRequest.Get, res: express.Response) => {
		res.json({ success: true });
	},
}; 
