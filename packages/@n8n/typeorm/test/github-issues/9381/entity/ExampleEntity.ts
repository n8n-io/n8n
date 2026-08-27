import { Entity, Generated, PrimaryColumn } from '../../../../src';

const ID_TRANSFORMER = {
	from: (dbValue: number) => dbValue?.toString(),
	to: (entityValue: string) => (entityValue ? Number(entityValue) : entityValue),
};

@Entity()
export class ExampleEntity {
	@Generated('increment')
	@PrimaryColumn({
		type: 'integer',
		transformer: ID_TRANSFORMER,
	})
	id: string;
}
