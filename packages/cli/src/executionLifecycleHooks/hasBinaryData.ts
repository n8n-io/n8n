import type { IRun } from 'n8n-workflow';

export function hasBinaryData(run: IRun) {
	const { runData } = run.data.resultData;

	return Object.keys(runData).some((nodeName) => {
		const binaryDataId = runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.binary?.data?.id;

		return binaryDataId !== undefined;
	});
}
