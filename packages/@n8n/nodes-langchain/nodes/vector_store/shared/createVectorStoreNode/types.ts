import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type {
	IExecuteFunctions,
	INodeCredentialDescription,
	INodeProperties,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	Icon,
	ISupplyDataFunctions,
	ThemeIconColor,
	IDataObject,
	NodeParameterValueType,
} from 'n8n-workflow';

export type NodeOperationMode = 'insert' | 'load' | 'retrieve' | 'update' | 'retrieve-as-tool';

export interface NodeMeta {
	displayName: string;
	name: string;
	description: string;
	docsUrl: string;
	icon: Icon;
	iconColor?: ThemeIconColor;
	credentials?: INodeCredentialDescription[];
	operationModes?: NodeOperationMode[];
	categories?: string[];
	subcategories?: Record<string, string[]>;
}

export interface VectorStoreNodeConstructorArgs<T extends VectorStore = VectorStore> {
	meta: NodeMeta;
	methods?: {
		listSearch?: {
			[key: string]: (
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			) => Promise<INodeListSearchResult>;
		};
		actionHandler?: {
			[functionName: string]: (
				this: ILoadOptionsFunctions,
				payload: IDataObject | string | undefined,
			) => Promise<NodeParameterValueType>;
		};
	};

	sharedFields: INodeProperties[];
	insertFields?: INodeProperties[];
	loadFields?: INodeProperties[];
	retrieveFields?: INodeProperties[];
	updateFields?: INodeProperties[];

	/**
	 * Function to populate the vector store with documents
	 * Used during the 'insert' operation mode
	 */
	populateVectorStore: (
		context: IExecuteFunctions | ISupplyDataFunctions,
		embeddings: Embeddings,
		documents: Array<Document<Record<string, unknown>>>,
		itemIndex: number,
	) => Promise<void>;

	/**
	 * Function to get the vector store client
	 * This function is called for all operation modes
	 */
	getVectorStoreClient: (
		context: IExecuteFunctions | ISupplyDataFunctions,
		filter: Record<string, never> | undefined,
		embeddings: Embeddings,
		itemIndex: number,
	) => Promise<T>;

	/**
	 * Optional function to release resources associated with the vector store client
	 * Called after the vector store operations are complete
	 */
	releaseVectorStoreClient?: (vectorStore: T) => void;
}
