import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import { IHttpRequestMethods } from 'n8n-workflow';

@Entity()
@Index(['webhookId', 'method', 'pathLength'])
export class WebhookEntity {
	@Column()
	workflowId: string;

	@PrimaryColumn()
	webhookPath: string;

	@PrimaryColumn({ type: 'text' })
	method: IHttpRequestMethods;

	@Column()
	node: string;

	@Column({ nullable: true })
	webhookId?: string;

	@Column({ nullable: true })
	pathLength?: number;

	get cacheKey() {
		return `webhook:${this.method}-${this.webhookPath}`;
	}

	/**
	 * Static segments available for scoring a template against a request, with
	 * the namespace segment dropped: it is matched separately by `webhookId`
	 * equality, and the request path the caller compares against has already had
	 * it stripped.
	 */
	get staticSegments() {
		return this.webhookPath
			.split('/')
			.slice(1)
			.filter((s) => !s.startsWith(':'));
	}

	/**
	 * Whether the webhook has at least one dynamic path segment, e.g. `:id` in `<uuid>/user/:id/posts`.
	 */
	get isDynamic() {
		return this.webhookPath.split('/').some((s) => s.startsWith(':'));
	}

	display() {
		return `${this.method} ${this.webhookPath}`;
	}
}
