import { Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Book {
	@PrimaryColumn()
	ean: string;
}

@Entity({ withoutRowid: true })
export class Book2 {
	@PrimaryColumn()
	ean: string;
}
