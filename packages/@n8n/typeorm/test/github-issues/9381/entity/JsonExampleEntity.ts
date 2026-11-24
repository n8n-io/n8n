import { Column, Entity, Generated, PrimaryColumn } from '../../../../src';

const ID_TRANSFORMER = {
	from: (dbValue: number) => dbValue?.toString(),
	to: (entityValue: string) => (entityValue ? Number(entityValue) : entityValue),
};

const JSON_TRANSFORMER = {
	to: (value: any) => ({ wrap: value }),
	from: (value: { wrap: any }) => value.wrap,
};

@Entity()
export class JsonExampleEntity {
	constructor(value: any) {
		this.jsonvalue = value;
	}

	@Generated('increment')
	@PrimaryColumn({
		type: 'integer',
		transformer: ID_TRANSFORMER,
	})
	id: string;

	@Column({ type: 'jsonb', transformer: JSON_TRANSFORMER })
	jsonvalue: any;
}
