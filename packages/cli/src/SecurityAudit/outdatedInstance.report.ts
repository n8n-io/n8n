/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/naming-convention */
import axios from 'axios';
import { UserSettings } from 'n8n-core';
import { GenericHelpers } from '..';
import config from '@/config';
import { segregate } from '@/utils';
import type { Version } from './types';
import { RISKS } from './constants';

export async function reportOutdatedInstance() {
	const allPackagesVersions = await GenericHelpers.getVersions();
	const currentVersionName = allPackagesVersions.cli; // @TODO: Test with 0.207.0

	const versions = await getNextVersions(currentVersionName).then(declutter);

	const { currentVersion, nextVersions } = classify(versions, currentVersionName);

	if (nextVersions.length === 0) return null;

	const description = [`This instance v${currentVersion.name} is outdated.`];

	const isMissingSecurityUpdates = nextVersions.some((v) => v.hasSecurityIssue || v.hasSecurityFix);

	if (isMissingSecurityUpdates) description.push('Newer versions contain security updates.');

	description.push(
		'Consider updating your instance to reduce the risk of security vulnerabilities.',
	);

	return {
		risk: RISKS.OUTDATED_INSTANCE,
		description: description.join(' '),
		nextVersions,
	};
}

async function getNextVersions(currentVersionName: string) {
	const baseUrl = config.get('versionNotifications.endpoint') as string;
	const instanceId = await UserSettings.getInstanceId();

	let response;

	try {
		response = await axios.get<Version[]>(baseUrl + currentVersionName, {
			headers: { 'n8n-instance-id': instanceId },
		});
	} catch (error) {
		throw new Error('Failed to retrieve n8n versions', { cause: error });
	}

	return response.data;
}

function declutter(versions: Version[]) {
	return versions.map((version) => {
		if (version.nodes.length === 0) return version;

		version.nodes = version.nodes.map((node) => {
			delete node.iconData;
			return node;
		});

		return version;
	});
}

function classify(versions: Version[], currentVersionName: string) {
	const [pass, fail] = segregate(versions, (v) => v.name === currentVersionName);

	return { currentVersion: pass[0], nextVersions: fail };
}
