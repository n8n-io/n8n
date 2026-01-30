import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

export interface AuthHandler {
	handleLogin(loginId: string, password: string): Promise<User | undefined>;
}

/**
 * Registry for authentication handlers. Allows modules to register
 * themselves dynamically without creating direct dependencies.
 */
@Service()
export class AuthHandlerRegistry {
	private handlers = new Map<string, AuthHandler>();

	register(authMethod: string, handler: AuthHandler): void {
		this.handlers.set(authMethod, handler);
	}

	get(authMethod: string): AuthHandler | undefined {
		return this.handlers.get(authMethod);
	}

	has(authMethod: string): boolean {
		return this.handlers.has(authMethod);
	}
}
