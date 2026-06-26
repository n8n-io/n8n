import {
	AfterRecover,
	AfterSoftRemove,
	AfterUpdate,
	BeforeRecover,
	BeforeSoftRemove,
	BeforeUpdate,
	Column,
	DeleteDateColumn,
	Entity,
	PrimaryGeneratedColumn,
} from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	data: string;

	@DeleteDateColumn()
	deletedAt: Date;

	@Column({ default: 0 })
	beforeUpdateListener: number;

	@Column({ default: 0 })
	afterUpdateListener: number;

	@Column({ default: 0 })
	beforeSoftRemoveListener: number;

	@Column({ default: 0 })
	afterSoftRemoveListener: number;

	@Column({ default: 0 })
	beforeRecoverListener: number;

	@Column({ default: 0 })
	afterRecoverListener: number;

	@Column({ default: 0 })
	beforeUpdateSubscriber: number;

	@Column({ default: 0 })
	afterUpdateSubscriber: number;

	@Column({ default: 0 })
	beforeSoftRemoveSubscriber: number;

	@Column({ default: 0 })
	afterSoftRemoveSubscriber: number;

	@Column({ default: 0 })
	beforeRecoverSubscriber: number;

	@Column({ default: 0 })
	afterRecoverSubscriber: number;

	@BeforeUpdate()
	beforeUpdate() {
		this.beforeUpdateListener++;
	}

	@AfterUpdate()
	afterUpdate() {
		this.afterUpdateListener++;
	}

	@BeforeSoftRemove()
	beforeSoftRemove() {
		this.beforeSoftRemoveListener++;
	}

	@AfterSoftRemove()
	afterSoftRemove() {
		this.afterSoftRemoveListener++;
	}

	@BeforeRecover()
	beforeRecover() {
		this.beforeRecoverListener++;
	}

	@AfterRecover()
	afterRecover() {
		this.afterRecoverListener++;
	}
}
