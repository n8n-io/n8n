/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import express = require('express');
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '../Logger';

import { Db, ResponseHelper, LoadNodesAndCredentials, Push } from '..';
import { NodeRequest } from '../requests';

export const nodesController = express.Router();

/**
 * Initialize Logger if needed
 */
nodesController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

nodesController.post(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Post) => {
		const { name } = req.body;
		if (name === undefined) {
			throw new ResponseHelper.ResponseError(`The parameter "name" is missing!`, undefined, 400);
		}

		try {
			const nodes = await LoadNodesAndCredentials().loadNpmModule(name);

			// Inform the connected frontends that new nodes are available
			nodes.forEach((nodeData) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('reloadNodeType', nodeData);
			});

			return {
				nodes,
			};
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`Error loading package "${name}": ${error.message}`,
				undefined,
				500,
			);
		}
	}),
);

// Install new credentials/nodes from npm
nodesController.get(
	'/',
	ResponseHelper.send(async () => {
		const packages = await Db.collections.InstalledPackages!.find({
			relations: ['installedNodes'],
		});
		return packages;
	}),
);

// Install new credentials/nodes from npm
nodesController.delete(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Delete) => {
		const installedPackage = await Db.collections.InstalledPackages!.findOne({
			where: {
				packageName: req.body.name,
			},
			relations: ['installedNodes'],
		});

		if (!installedPackage) {
			throw new ResponseHelper.ResponseError('Package is not installed', undefined, 400);
		}

		try {
			void (await LoadNodesAndCredentials().removeNpmModule(
				req.body.name,
				installedPackage.installedNodes,
			));

			// Inform the connected frontends that new nodes are available
			installedPackage.installedNodes.forEach((installedNode) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('removeNodeType', {
					name: installedNode.type,
					version: installedNode.latestVersion,
				});
			});
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`Error removing package "${req.body.name}": ${error.message}`,
				undefined,
				500,
			);
		}

		void (await Db.collections.InstalledPackages!.remove(installedPackage));
	}),
);

// Update a package
nodesController.patch(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Update) => {
		const installedPackage = await Db.collections.InstalledPackages!.findOne({
			where: {
				packageName: req.body.name,
			},
			relations: ['installedNodes'],
		});

		if (!installedPackage) {
			throw new ResponseHelper.ResponseError('Package is not installed', undefined, 400);
		}

		try {
			const installedNodes = await LoadNodesAndCredentials().updateNpmModule(
				req.body.name,
				installedPackage.installedNodes,
			);

			// Inform the connected frontends that new nodes are available
			installedPackage.installedNodes.forEach((installedNode) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('removeNodeType', {
					name: installedNode.type,
					version: installedNode.latestVersion,
				});
			});

			installedNodes.forEach((nodeData) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('reloadNodeType', nodeData);
			});
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`Error updating package "${req.body.name}": ${error.message}`,
				undefined,
				500,
			);
		}
	}),
);
