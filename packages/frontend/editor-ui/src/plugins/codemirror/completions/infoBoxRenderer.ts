import type { Completion } from '@codemirror/autocomplete';
import type { DocMetadata, DocMetadataArgument, DocMetadataExample } from 'n8n-workflow';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { i18n } from '@n8n/i18n';

const shouldHighlightArgument = (
	arg: DocMetadataArgument,
	index: number,
	highlightArgIndex?: number,
) => {
	if (arg.variadic) {
		return (highlightArgIndex ?? 0) >= index;
	}

	return highlightArgIndex === index;
};

const renderFunctionHeader = (doc?: DocMetadata, highlightArgIndex?: number) => {
	const header = document.createElement('div');
	if (doc) {
		const functionNameSpan = document.createElement('span');
		functionNameSpan.classList.add('autocomplete-info-name');
		functionNameSpan.textContent = doc.name;
		header.appendChild(functionNameSpan);

		const openBracketsSpan = document.createElement('span');
		openBracketsSpan.textContent = '(';
		header.appendChild(openBracketsSpan);

		const argsSpan = document.createElement('span');
		doc.args?.forEach((arg, index, array) => {
			const optional = arg.optional && !arg.name.endsWith('?');
			const argSpan = document.createElement(
				shouldHighlightArgument(arg, index, highlightArgIndex) ? 'strong' : 'span',
			);
			argSpan.classList.add('autocomplete-info-arg');
			argSpan.textContent = arg.name;

			if (optional) {
				argSpan.textContent += '?';
			}

			if (arg.variadic) {
				argSpan.textContent = '...' + argSpan.textContent;
			}

			argsSpan.appendChild(argSpan);

			if (index !== array.length - 1) {
				const separatorSpan = document.createElement('span');
				separatorSpan.textContent = ', ';
				argsSpan.appendChild(separatorSpan);
			}
		});
		header.appendChild(argsSpan);

		const closingBracket = document.createElement('span');
		closingBracket.textContent = ')';
		header.appendChild(closingBracket);
	}
	return header;
};

const renderPropHeader = (doc?: DocMetadata) => {
	const header = document.createElement('div');
	if (doc) {
		const propNameSpan = document.createElement('span');
		propNameSpan.classList.add('autocomplete-info-name');
		propNameSpan.textContent = doc.name;

		header.appendChild(propNameSpan);
	}
	return header;
};

const renderDescription = ({
	description,
	docUrl,
	example,
}: {
	description: string;
	docUrl?: string;
	example?: DocMetadataExample;
}) => {
	const descriptionBody = document.createElement('div');
	descriptionBody.classList.add('autocomplete-info-description');
	const descriptionText = document.createElement('p');
	const separator = !description.endsWith('.') && docUrl ? '. ' : ' ';
	descriptionText.innerHTML = sanitizeHtml(
		description.replace(/`(.*?)`/g, '<code>$1</code>') + separator,
	);
	descriptionBody.appendChild(descriptionText);

	if (docUrl) {
		const descriptionLink = document.createElement('a');
		descriptionLink.setAttribute('target', '_blank');
		descriptionLink.setAttribute('href', docUrl);
		descriptionLink.innerText =
			i18n.autocompleteUIValues.docLinkLabel ?? i18n.baseText('generic.learnMore');
		descriptionLink.addEventListener('mousedown', (event: MouseEvent) => {
			// This will prevent documentation popup closing before click
			// event gets to links
			event.preventDefault();
		});
		descriptionLink.classList.add('autocomplete-info-doc-link');
		descriptionText.appendChild(descriptionLink);
	}

	if (example) {
		const renderedExample = renderExample(example);
		descriptionBody.appendChild(renderedExample);
	}

	return descriptionBody;
};

const renderArg = (arg: DocMetadataArgument, highlight: boolean) => {
	const argItem = document.createElement('li');
	const argName = document.createElement(highlight ? 'strong' : 'span');
	argName.classList.add('autocomplete-info-arg-name');
	argName.textContent = arg.name.replaceAll('?', '');
	const tags = [];

	if (arg.type) {
		tags.push(arg.type);
	}

	if (!!arg.optional || arg.name.endsWith('?')) {
		tags.push(i18n.baseText('codeNodeEditor.optional'));
	}

	if (tags.length > 0) {
		argName.textContent += ` (${tags.join(', ')})`;
	}

	if (arg.description) {
		argName.textContent += ':';
	}
	argItem.appendChild(argName);

	if (arg.description) {
		const argDescription = document.createElement('span');
		argDescription.classList.add('autocomplete-info-arg-description');

		if (arg.default && arg.optional && !arg.description.toLowerCase().includes('default')) {
			const separator = arg.description.endsWith('.') ? ' ' : '. ';
			arg.description +=
				separator +
				i18n.baseText('codeNodeEditor.defaultsTo', {
					interpolate: { default: arg.default },
				});
		}

		argDescription.innerHTML = sanitizeHtml(arg.description.replace(/`(.*?)`/g, '<code>$1</code>'));

		argItem.appendChild(argDescription);
	}

	if (Array.isArray(arg.args)) {
		argItem.appendChild(renderArgList(arg.args));
	}

	return argItem;
};

const renderArgList = (args: DocMetadataArgument[], highlightArgIndex?: number) => {
	const argsList = document.createElement('ul');
	argsList.classList.add('autocomplete-info-args');

	args.forEach((arg, index) => {
		argsList.appendChild(renderArg(arg, shouldHighlightArgument(arg, index, highlightArgIndex)));
	});

	return argsList;
};

const renderArgs = (args: DocMetadataArgument[], highlightArgIndex?: number) => {
	const argsContainer = document.createElement('div');
	argsContainer.classList.add('autocomplete-info-args-container');

	const argsTitle = document.createElement('div');
	argsTitle.classList.add('autocomplete-info-section-title');
	argsTitle.textContent = i18n.baseText('codeNodeEditor.parameters');
	argsContainer.appendChild(argsTitle);
	argsContainer.appendChild(renderArgList(args, highlightArgIndex));
	return argsContainer;
};

const renderExample = (example: DocMetadataExample) => {
	const examplePre = document.createElement('pre');
	examplePre.classList.add('autocomplete-info-example');
	const exampleCode = document.createElement('code');
	examplePre.appendChild(exampleCode);

	if (example.description) {
		const exampleDescription = document.createElement('span');
		exampleDescription.classList.add('autocomplete-info-example-comment');
		exampleDescription.textContent = `// ${example.description}\n`;
		exampleCode.appendChild(exampleDescription);
	}

	const exampleExpression = document.createElement('span');
	exampleExpression.classList.add('autocomplete-info-example-expr');
	exampleExpression.textContent = example.example + '\n';
	exampleCode.appendChild(exampleExpression);

	if (example.evaluated) {
		const exampleEvaluated = document.createElement('span');
		exampleEvaluated.classList.add('autocomplete-info-example-comment');
		exampleEvaluated.textContent = `// => ${example.evaluated}\n`;
		exampleCode.appendChild(exampleEvaluated);
	}

	return examplePre;
};

const renderExamples = (examples: DocMetadataExample[]) => {
	const examplesContainer = document.createElement('div');
	examplesContainer.classList.add('autocomplete-info-examples');

	const examplesTitle = document.createElement('div');
	examplesTitle.classList.add('autocomplete-info-section-title');
	examplesTitle.textContent = i18n.baseText('codeNodeEditor.examples');
	examplesContainer.appendChild(examplesTitle);

	const examplesList = document.createElement('div');
	examplesList.classList.add('autocomplete-info-examples-list');

	for (const example of examples) {
		const renderedExample = renderExample(example);
		examplesList.appendChild(renderedExample);
	}

	examplesContainer.appendChild(examplesList);
	return examplesContainer;
};

export const createInfoBoxRenderer =
	(doc?: DocMetadata, isFunction = false) =>
	(_completion: Completion, highlightArgIndex = -1) => {
		const tooltipContainer = document.createElement('div');
		tooltipContainer.setAttribute('tabindex', '-1');
		tooltipContainer.setAttribute('title', '');
		tooltipContainer.classList.add('autocomplete-info-container');

		if (!doc) return null;

		const { examples, args } = doc;
		const hasArgs = args && args.length > 0;
		const hasExamples = examples && examples.length > 0;

		const header = isFunction
			? renderFunctionHeader(doc, highlightArgIndex)
			: renderPropHeader(doc);
		header.classList.add('autocomplete-info-header');
		tooltipContainer.appendChild(header);

		if (doc.description) {
			const descriptionBody = renderDescription({
				description: doc.description,
				docUrl: doc.docURL,
				example: hasArgs && hasExamples ? examples[0] : undefined,
			});
			tooltipContainer.appendChild(descriptionBody);
		}

		if (hasArgs) {
			const argsContainer = renderArgs(args, highlightArgIndex);
			tooltipContainer.appendChild(argsContainer);
		}

		if (hasExamples && (examples.length > 1 || !hasArgs)) {
			const examplesContainer = renderExamples(examples);
			tooltipContainer.appendChild(examplesContainer);
		}

		return tooltipContainer;
	};
