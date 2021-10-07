import {
	Expression,
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
const parseExpression = (
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
	workflow.expression = expression;
	
	return workflow.expression.getParameterValue(
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

const init = () => {
	Expression.extendTypes();
	// @ts-ignore
	window.parseExpression = parseExpression;
};

init();
