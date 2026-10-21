import { agentToolsV1ToV2 } from './agent-tools-v1-to-v2.migration';
import { aiTransformToCode } from './ai-transform-to-code.migration';
import {
	binaryInputLoaderToDefaultDataLoader,
	jsonInputLoaderToDefaultDataLoader,
} from './document-loaders.migration';
import { htmlExtractToHtml } from './html-extract-to-html.migration';
import { icalToConvertToFile } from './ical-to-convert-to-file.migration';
import { itemListsToTransformNodes } from './item-lists.migration';
import { readPdfToExtractFromFile } from './read-pdf-to-extract-from-file.migration';
import { cronToScheduleTrigger } from './schedule-trigger.migration';
import {
	inMemoryInsertToVectorStore,
	inMemoryLoadToVectorStore,
	pineconeInsertToVectorStore,
	pineconeLoadToVectorStore,
	supabaseInsertToVectorStore,
	supabaseLoadToVectorStore,
} from './vector-stores.migration';
import { workflowTriggerToN8nTrigger } from './workflow-trigger-to-n8n-trigger.migration';
import { writeBinaryFileToReadWriteFile } from './write-binary-file-to-read-write-file.migration';
import type { Migration } from '../node-migration';

export const nodeRemovalMigrations: Migration[] = [
	agentToolsV1ToV2,
	aiTransformToCode,
	binaryInputLoaderToDefaultDataLoader,
	cronToScheduleTrigger,
	htmlExtractToHtml,
	icalToConvertToFile,
	inMemoryInsertToVectorStore,
	inMemoryLoadToVectorStore,
	itemListsToTransformNodes,
	jsonInputLoaderToDefaultDataLoader,
	pineconeInsertToVectorStore,
	pineconeLoadToVectorStore,
	readPdfToExtractFromFile,
	supabaseInsertToVectorStore,
	supabaseLoadToVectorStore,
	workflowTriggerToN8nTrigger,
	writeBinaryFileToReadWriteFile,
];
