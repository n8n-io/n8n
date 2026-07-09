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

	/**
	 * Unique section of webhook path.
	 *
	 * - Static: `${uuid}` or `user/defined/path`
	 * - Dynamic: `${uuid}/user/:id/posts`
	 *
	 * Appended to `${instanceUrl}/webhook/` or `${instanceUrl}/test-webhook/`.
	 */
	private get uniquePath() {
		return this.webhookPath.includes(':')
			? [this.webhookId, this.webhookPath].join('/')
			: this.webhookPath;
	}

	get cacheKey() {
		return `webhook:${this.method}-${this.uniquePath}`;
	}

	get staticSegments() {
		return this.webhookPath.split('/').filter((s) => !s.startsWith(':'));
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
