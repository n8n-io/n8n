import type { INodeType, SupplyData, IExecuteFunctions, IVersionedNodeType } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { convertNodeToTool } from './helpers';

export function nodeToTool<
	T extends (new (...args: any[]) => INodeType) | (new () => IVersionedNodeType),
>(nodeType: T): T {
	const myNodeType: INodeType | IVersionedNodeType = new nodeType();

	class NewNodeType extends nodeType {
		constructor(...args: any[]) {
			super(...args);

			// @ts-ignore
			if (this.nodeVersions) {
				// VersionedNodes are themselves a wrapper around other nodes, based on
				// the version of the node. To support this, we need to convert the
				// description of our copy of the nodeVersions.
				// @ts-ignore
				this.nodeVersions = Object.fromEntries(
					// @ts-ignore
					Object.entries(this.nodeVersions).map(([version, versionedNodeType]: [string, T]) => {
						return [version, this.convertDescription(versionedNodeType)];
					}),
				);
			}
			this.convertDescription(this);
		}

		private convertDescription(item: any) {
			// @ts-ignore
			item.description.inputs = [];
			// @ts-ignore
			item.description.outputs = [NodeConnectionType.AiTool];
			// @ts-ignore
			item.description.codex = {
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Other Tools'],
				},
			};
			// @ts-ignore
			item.description.displayName += ' Tool';
			return item;
		}

		// TODO -- Some issue with versioned / routered nodes? See airtable. That one will not really work in this mode...

		async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
			return {
				// @ts-ignore
				response: convertNodeToTool(myNodeType, this, this.getNode().parameters),
			};
		}
	}

	return NewNodeType;
}
