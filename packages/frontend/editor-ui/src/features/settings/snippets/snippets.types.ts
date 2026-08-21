import type { SnippetTestCase } from 'n8n-workflow';

export interface SnippetResource {
	id: string;
	name: string;
	code: string;
	description: string | null;
	tests: SnippetTestCase[] | null;
	project?: { id: string; name: string } | null;
}

export interface CreateSnippet {
	name: string;
	code: string;
	description?: string;
	tests?: SnippetTestCase[];
	projectId?: string;
}

export interface UpdateSnippet {
	id: string;
	name?: string;
	code?: string;
	description?: string | null;
	tests?: SnippetTestCase[] | null;
	projectId?: string | null;
}
