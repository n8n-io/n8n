#!/usr/bin/env zx
/**
 * Script that deletes all resources created by the benchmark environment
 * and that are older than 2 hours.
 *
 * Even tho the environment is provisioned using terraform, the terraform
 * state is not persisted. Hence we can't use terraform to delete the resources.
 * We could store the state to a storage account, but then we wouldn't be able
 * to spin up new envs on-demand. Hence this design.
 *
 * Usage:
 * 	 zx scripts/deleteCloudEnv.mjs
 */
// @ts-check
import { $ } from 'zx';

const EXPIRE_TIME_IN_H = 2;
const EXPIRE_TIME_IN_MS = EXPIRE_TIME_IN_H * 60 * 60 * 1000;
const RESOURCE_GROUP_NAME = 'n8n-benchmarking';

async function main() {
	const resourcesResult =
		await $`az resource list --resource-group ${RESOURCE_GROUP_NAME} --query "[?tags.Id == 'N8nBenchmark'].{id:id, createdAt:tags.CreatedAt}" -o json`;

	const resources = JSON.parse(resourcesResult.stdout);

	const now = Date.now();

	const resourcesToDelete = resources
		.filter((resource) => {
			if (resource.createdAt === undefined) {
				return true;
			}

			const createdAt = new Date(resource.createdAt);
			const resourceExpiredAt = createdAt.getTime() + EXPIRE_TIME_IN_MS;

			return now > resourceExpiredAt;
		})
		.map((resource) => resource.id);

	if (resourcesToDelete.length === 0) {
		if (resources.length === 0) {
			console.log('No resources found in the resource group.');
		} else {
			console.log(
				`Found ${resources.length} resources in the resource group, but none are older than ${EXPIRE_TIME_IN_H} hours.`,
			);
		}

		return;
	}

	await deleteResources(resourcesToDelete);
}

async function deleteResources(resourceIds) {
	// We don't know the order in which resource should be deleted.
	// Here's a poor person's approach to try deletion until all complete
	const MAX_ITERATIONS = 100;
	let i = 0;
	const toDelete = [...resourceIds];

	console.log(`Deleting ${resourceIds.length} resources...`);
	while (toDelete.length > 0) {
		const resourceId = toDelete.shift();
		const deleted = await deleteById(resourceId);
		if (!deleted) {
			toDelete.push(resourceId);
		}

		if (i++ > MAX_ITERATIONS) {
			console.log(
				`Max iterations reached. Exiting. Could not delete ${toDelete.length} resources.`,
			);
			process.exit(1);
		}
	}
}

async function deleteById(id) {
	try {
		await $`az resource delete --ids ${id}`;
		return true;
	} catch (error) {
		return false;
	}
}

main();
