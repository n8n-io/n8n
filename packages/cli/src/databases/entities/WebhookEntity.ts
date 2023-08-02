import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
@Index(['webhookId', 'method', 'pathLength'])
export class WebhookEntity {
	@Column()
	workflowId: string;

	@PrimaryColumn()
	webhookPath: string;

	@PrimaryColumn()
	method: string;

	@Column()
	node: string;

	@Column({ nullable: true })
	webhookId?: string;

	@Column({ nullable: true })
	pathLength?: number;

	/**
	 * Unique part of production webhook URL, excluding instance URL and base `webhook/` segment.
	 */
	get uniquePath() {
		return this.webhookPath.includes(':') ? this.workflowId + this.webhookPath : this.webhookPath;
	}

	get cacheKey() {
		return `cache:webhook:${this.method}-${this.uniquePath}`;
	}

	get staticSegments() {
		return this.webhookPath.split('/').filter((s) => !s.includes(':'));
	}
}
