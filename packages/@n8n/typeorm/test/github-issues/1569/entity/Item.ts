import { Entity, Column, PrimaryGeneratedColumn } from '../../../../src/index';

export class EmbeddedItem {
	@Column({ type: 'integer', array: true })
	arrayInsideEmbedded: number[];
}

@Entity()
export class Item {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	someText: string;

	@Column((type) => EmbeddedItem)
	embedded: EmbeddedItem;
}
