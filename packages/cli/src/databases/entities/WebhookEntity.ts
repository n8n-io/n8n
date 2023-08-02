import { IHttpRequestMethods } from 'n8n-workflow';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

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
	 * Unique path section of production webhook URL, excluding instance URL and base `webhook/` segment.
	 */
	private get uniquePath() {
		return this.webhookPath.includes(':') ? this.workflowId + this.webhookPath : this.webhookPath;
	}

	get cacheKey() {
		return `cache:webhook:${this.method}-${this.uniquePath}`;
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
}
