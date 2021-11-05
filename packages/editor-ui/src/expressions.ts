import {
	Expression,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValue,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

// This function is available inside the iframe only.
// We decided to isolate this inside an iframe so that
// the native prototype extensions do not polute
// global namespace on main n8n's editor window.
// This acts as a proxy
const getParameterValue = (
	workflow: Workflow,
	parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
	runExecutionData: IRunExecutionData,
	runIndex: number,
	itemIndex: number,
	activeNodeName: string,
	connectionInputData: INodeExecutionData[],
	mode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	returnObjectAsString: boolean,
	selfData?: {},
): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] => {
	// Workflow instance is always recreated
	// so we have to always rewrite the expression object.
	const expression = new Expression(workflow);

	return expression.getParameterValue(
		parameter,
		runExecutionData,
		runIndex,
		itemIndex,
		activeNodeName,
		connectionInputData,
		mode,
		additionalKeys,
		returnObjectAsString,
		selfData,
	);
};

const getSimpleParameterValue = (
	workflow: Workflow,
	node: INode,
	parameterValue: string | boolean | undefined,
	mode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	defaultValue?: boolean | number | string,
): boolean | number | string | undefined => {
	// Workflow instance is always recreated
	// so we have to always rewrite the expression object.
	const expression = new Expression(workflow);

	return expression.getSimpleParameterValue(
		node,
		parameterValue,
		mode,
		additionalKeys,
		defaultValue,
	);

};

const init = () => {
	// eslint-disable-next-line no-console
	console.log('Extending expressions inside iframe');
	Expression.extendTypes();
	// eslint-disable-next-line no-console
	console.log('Ending extending expressions inside iframe');
	// @ts-ignore
	window.getParameterValue = getParameterValue;
	// @ts-ignore
	window.getSimpleParameterValue = getSimpleParameterValue;
};

init();
