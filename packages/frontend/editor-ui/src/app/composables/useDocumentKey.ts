import { computed, inject, provide, type ComputedRef, type Ref } from 'vue';
import type { DocumentKey } from '@/Interface';
import { createDocumentKey } from '@/app/stores/workflows.store';

const DOCUMENT_KEY_INJECTION_KEY = Symbol('documentKey');

/**
 * Provides a document key to the component tree.
 * Call this in the root component that manages the workflow (e.g., NodeView).
 *
 * @param workflowId The workflow ID
 * @param version The version (defaults to 'latest')
 * @returns The document key computed ref (automatically updates when workflowId changes)
 */
export function provideDocumentKey(
	workflowId: Ref<string>,
	version: string = 'latest',
): ComputedRef<DocumentKey> {
	const documentKey = computed(() => createDocumentKey(workflowId.value, version));

	provide(DOCUMENT_KEY_INJECTION_KEY, documentKey);

	return documentKey;
}

/**
 * Provides a pre-existing document key ref to the component tree.
 * Use this when you already have a document key ref.
 *
 * @param documentKey The document key ref to provide
 */
export function provideDocumentKeyRef(documentKey: Ref<DocumentKey>): void {
	provide(DOCUMENT_KEY_INJECTION_KEY, documentKey);
}

/**
 * Injects the document key from the component tree.
 * Must be called within a component that has a parent providing the document key.
 *
 * @returns The document key computed ref
 * @throws Error if no document key is provided
 */
export function useDocumentKey(): ComputedRef<DocumentKey> {
	const documentKey = inject<ComputedRef<DocumentKey>>(DOCUMENT_KEY_INJECTION_KEY);

	if (!documentKey) {
		throw new Error(
			'useDocumentKey must be used within a component tree that has called provideDocumentKey',
		);
	}

	return documentKey;
}

/**
 * Optionally injects the document key from the component tree.
 * Returns undefined if no document key is provided (instead of throwing).
 *
 * @returns The document key computed ref or undefined
 */
export function useDocumentKeyOptional(): ComputedRef<DocumentKey> | undefined {
	return inject<ComputedRef<DocumentKey>>(DOCUMENT_KEY_INJECTION_KEY);
}
