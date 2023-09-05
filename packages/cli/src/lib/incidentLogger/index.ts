import incidentHandler from '@deep-consulting-solutions/incident-handling';
import express from 'express';
import type { Incident } from '@deep-consulting-solutions/incident-handling';
import type { INode, IRun, Workflow } from 'n8n-workflow';
import { setupReusablesAndRoutes } from '../../reusables';

export const generateCreateCustomTicketSubjectFn = (nodes: INode[]) => {
	const isScheduleTriggerOrNocoDBAuthWebhook = nodes.some((node: INode) => {
		if (node.name === 'Schedule Trigger') {
			return true;
		}
		if (node.name === 'Webhook' && node.parameters.authentication === 'nocoDBWebhookAuth') {
			return true;
		}
		return false;
	});

	return (defaultTitle: string) => {
		return isScheduleTriggerOrNocoDBAuthWebhook
			? `System triggered - ${defaultTitle}`
			: defaultTitle;
	};
};

export const createIncidentLog = async (
	data: Incident,
	extras?: Record<string, any>,
	createCustomTicketSubject?: (defaultTitle: string) => string,
) => {
	console.log('Creating Incident Log...');
	try {
		await incidentHandler.logIncident(data, extras, {
			createCustomTicketSubject,
		});
	} catch (error) {
		console.log('ERROR while creating Incident Log:', error);
		throw error;
	}
};

const getIncidentHandlingFNWithNewServer = (() => {
	let createIncidentLogFN: typeof createIncidentLog;
	return async () => {
		if (createIncidentLogFN) return { createLog: createIncidentLogFN };
		const app = express();
		await setupReusablesAndRoutes(app);
		createIncidentLogFN = createIncidentLog;
		return { createLog: createIncidentLogFN };
	};
})();

export const logIncidentFromWorkflowExecute = async (
	data: IRun,
	workflow: Workflow,
	isChildProcess?: boolean,
) => {
	if (data.data.resultData.error) {
		const { runData, error } = data.data.resultData;
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		const nodeStack = data.data.executionData?.nodeExecutionStack || [];
		const errorNodeName = Object.keys(runData).find((nodeName) => {
			return runData[nodeName].some((d) => {
				return d.executionStatus === 'error' && d.error;
			});
		});
		const errorNode = nodeStack.find(({ node }) => {
			return node.name === errorNodeName;
		});

		const createLog = await (async () => {
			if (!isChildProcess) return createIncidentLog;
			const { createLog: cL } = await getIncidentHandlingFNWithNewServer();
			return cL;
		})();

		console.log('Attemping to create log...');
		try {
			await createLog(
				{
					errorMessage: error?.message,
					incidentTime: new Date(),
				},
				{
					workflow_id: workflow?.id,
					error_node_id: errorNode?.node.id,
					error_node_type: errorNode?.node.type,
					error_message: error?.message,
				},
				generateCreateCustomTicketSubjectFn(Object.values(workflow?.nodes)),
			);
		} catch (e) {
			console.log('ERROR when attemping to create incident log:', e);
			throw error;
		}
	}
};
