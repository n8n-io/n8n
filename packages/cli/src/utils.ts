/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CliWorkflowOperationError, SubworkflowOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import { STARTING_NODES } from './constants';

/**
 * Returns if the given id is a valid workflow id
 */
export function isWorkflowIdValid(id: string | null | undefined): boolean {
	// TODO: could also check if id only contains nanoId characters
	return typeof id === 'string' && id?.length <= 16;
}

function findWorkflowStart(executionMode: 'integrated' | 'cli') {
	return function (nodes: INode[]) {
		const executeWorkflowTriggerNode = nodes.find(
			(node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger',
		);

		if (executeWorkflowTriggerNode) return executeWorkflowTriggerNode;

		const startNode = nodes.find((node) => STARTING_NODES.includes(node.type));

		if (startNode) return startNode;

		const title = 'Missing node to start execution';
		const description =
			"Please make sure the workflow you're calling contains an Execute Workflow Trigger node";

		if (executionMode === 'integrated') {
			throw new SubworkflowOperationError(title, description);
		}

		throw new CliWorkflowOperationError(title, description);
	};
}

export const findSubworkflowStart = findWorkflowStart('integrated');

export const findCliWorkflowStart = findWorkflowStart('cli');

export const alphabetizeKeys = (obj: INode) =>
	Object.keys(obj)
		.sort()
		.reduce<Partial<INode>>(
			(acc, key) => ({
				...acc,
				// @ts-expect-error @TECH_DEBT Adding index signature to INode causes type issues downstream
				[key]: obj[key],
			}),
			{},
		);

export const separate = <T>(array: T[], test: (element: T) => boolean) => {
	const pass: T[] = [];
	const fail: T[] = [];

	array.forEach((i) => (test(i) ? pass : fail).push(i));

	return [pass, fail];
};

export const webhookNotFoundErrorMessage = (
	path: string,
	httpMethod?: string,
	webhookMethods?: string[],
) => {
	let webhookPath = path;

	if (httpMethod) {
		webhookPath = `${httpMethod} ${webhookPath}`;
	}

	if (webhookMethods?.length && httpMethod) {
		let methods = '';

		if (webhookMethods.length === 1) {
			methods = webhookMethods[0];
		} else {
			const lastMethod = webhookMethods.pop();

			methods = `${webhookMethods.join(', ')} or ${lastMethod as string}`;
		}

		return `This webhook is not registered for ${httpMethod} requests. Did you mean to make a ${methods} request?`;
	} else {
		return `The requested webhook "${webhookPath}" is not registered.`;
	}
};

export const toError = (maybeError: unknown) =>
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	maybeError instanceof Error ? maybeError : new Error(`${maybeError}`);

export function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export const isIntegerString = (value: string) => /^\d+$/.test(value);

export function isObjectLiteral(item: unknown): item is { [key: string]: string } {
	return typeof item === 'object' && item !== null && !Array.isArray(item);
}

export const createErrorPage = (title: string, message: string) => {
	const html = `
	<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="https://n8n.io/favicon.ico" />
  <title>${title}</title>
  <style>
    *,
    ::after,
    ::before {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: sans-serif;
      font-weight: 400;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      justify-content: start;
    }

    .container {
      margin: 1em auto;
      text-align: center;
      min-width: 30em;
      max-width: 50em;
      padding: 1em;

    }

    .n8n-link {
      color: grey;
      margin: 1em;
      font-weight: 400;
      font-size: 1.2em;
    }

    .n8n-link a {
      color: grey;
      font-weight: 400;
      font-size: 1.2em;
      text-decoration: none;
    }

    .n8n-link strong {
      color: black;
      font-weight: 700;
      font-size: 1.3em;
    }

    .n8n-link img {
      display: inline-block;
      vertical-align: middle;
    }

    .header {
      color: grey;
      margin-top: 2em;
      margin-bottom: 3em;
      font-size: 1em;
      border-radius: 0.5em;
			max-width: 40em;
    }

    .header h1 {
      /* margin-top: 2em; */
      font-size: 2em;
      font-weight: 600;
    }

    .header p {
      margin: 1em auto;
      font-size: 1.3em;
      font-weight: 500;

    }

    .card {
      margin: 1em;
      padding: 0.5em 1em;
      background-color: white;
      border: 0.1em solid lightgray;
      border-radius: 0.5em;
      box-shadow: 0 0.3em 2em rgba(0, 0, 0, 0.1);
      min-width: 40em;
    }
  </style>
</head>

<body>
  <div class="container">
    <section>
      <div class="card">
        <div class="header">
          <h1>${title}</h1>
          <p>${message}</p>
        </div>
      </div>
      <div class="n8n-link">
        <a href="https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger" target="_blank">
          Form automated with <img src="https://n8n.io/favicon.ico" alt="n8n logo"> <strong>n8n</strong>
        </a>
      </div>
    </section>
  </div>
</body>

</html>
	`;
	return html;
};
