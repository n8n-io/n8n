import type { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import type { Variables } from '@/databases/entities/Variables';

export interface ImportResult {
	workflows: Array<{
		id: string;
		name: string;
	}>;
	credentials: CredentialsEntity[];
	variables: Variables[];
	removedFiles?: string[];
}
