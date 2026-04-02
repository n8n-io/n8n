export interface ICredentialEntriesStorage {
	/**
	 * Retrieves credential data for a specific entity from storage.
	 *
	 * @returns The credential data object, or null if not found
	 * @throws {Error} When storage operation fails
	 */
	getCredentialData(
		credentialId: string,
		subjectId: string,
		resolverId: string,
		storageOptions: Record<string, unknown>,
	): Promise<string | null>;

	/**
	 * Stores credential data for a specific entity in storage.
	 * @throws {Error} When storage operation fails
	 */
	setCredentialData(
		credentialId: string,
		subjectId: string,
		resolverId: string,
		data: string,
		storageOptions: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Deletes credential data for a specific entity from storage.
	 * Optional - not all storage implementations support deletion.
	 * @throws {Error} When deletion operation fails
	 */
	deleteCredentialData?(
		credentialId: string,
		subjectId: string,
		resolverId: string,
		storageOptions: Record<string, unknown>,
	): Promise<void>;
}
