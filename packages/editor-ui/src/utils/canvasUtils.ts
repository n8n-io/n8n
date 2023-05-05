import { MAIN_HEADER_TABS, VIEWS } from '@/constants';
import type { IZoomConfig } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows';
import type { ConnectionDetachedParams } from '@jsplumb/core';
import type { IConnection } from 'n8n-workflow';
import type { Route } from 'vue-router';

/*
	Constants and utility functions mainly used by canvas store
	and components used to display workflow in node view.
	These are general-purpose functions that are exported
	with this module and should be used by importing from
	'@/utils'.
*/

export const scaleSmaller = ({ scale, offset: [xOffset, yOffset] }: IZoomConfig): IZoomConfig => {
	scale /= 1.25;
	xOffset /= 1.25;
	yOffset /= 1.25;
	xOffset += window.innerWidth / 10;
	yOffset += window.innerHeight / 10;

	return {
		scale,
		offset: [xOffset, yOffset],
	};
};

export const scaleBigger = ({ scale, offset: [xOffset, yOffset] }: IZoomConfig): IZoomConfig => {
	scale *= 1.25;
	xOffset -= window.innerWidth / 10;
	yOffset -= window.innerHeight / 10;
	xOffset *= 1.25;
	yOffset *= 1.25;

	return {
		scale,
		offset: [xOffset, yOffset],
	};
};

export const scaleReset = (config: IZoomConfig): IZoomConfig => {
	if (config.scale > 1) {
		// zoomed in
		while (config.scale > 1) {
			config = scaleSmaller(config);
		}
	} else {
		while (config.scale < 1) {
			config = scaleBigger(config);
		}
	}

	config.scale = 1;

	return config;
};

export const closestNumberDivisibleBy = (inputNumber: number, divisibleBy: number): number => {
	const quotient = Math.ceil(inputNumber / divisibleBy);

	// 1st possible closest number
	const inputNumber1 = divisibleBy * quotient;

	// 2nd possible closest number
	const inputNumber2 =
		inputNumber * divisibleBy > 0 ? divisibleBy * (quotient + 1) : divisibleBy * (quotient - 1);

	// if true, then inputNumber1 is the required closest number
	if (Math.abs(inputNumber - inputNumber1) < Math.abs(inputNumber - inputNumber2)) {
		return inputNumber1;
	}

	// else inputNumber2 is the required closest number
	return inputNumber2;
};

export const getNodeViewTab = (route: Route): string | null => {
	if (route.meta?.nodeView) {
		return MAIN_HEADER_TABS.WORKFLOW;
	} else if (
		[VIEWS.WORKFLOW_EXECUTIONS, VIEWS.EXECUTION_PREVIEW, VIEWS.EXECUTION_HOME]
			.map(String)
			.includes(String(route.name))
	) {
		return MAIN_HEADER_TABS.EXECUTIONS;
	}
	return null;
};

export const getConnectionInfo = (
	connection: ConnectionDetachedParams,
): [IConnection, IConnection] | null => {
	const sourceInfo = connection.sourceEndpoint.parameters;
	const targetInfo = connection.targetEndpoint.parameters;
	const sourceNode = useWorkflowsStore().getNodeById(sourceInfo.nodeId);
	const targetNode = useWorkflowsStore().getNodeById(targetInfo.nodeId);

	if (sourceNode && targetNode) {
		return [
			{
				node: sourceNode.name,
				type: sourceInfo.type,
				index: sourceInfo.index,
			},
			{
				node: targetNode.name,
				type: targetInfo.type,
				index: targetInfo.index,
			},
		];
	}
	return null;
};
