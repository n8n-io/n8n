import { Entity, Column, PrimaryColumn } from '../../../../../src';

export enum NumericEnum {
	ADMIN,
	EDITOR,
	MODERATOR,
	GHOST,
}

export enum StringEnum {
	ADMIN = 'a',
	EDITOR = 'e',
	MODERATOR = 'm',
	GHOST = 'g',
}

export enum StringNumericEnum {
	ONE = '1',
	TWO = '2',
	THREE = '3',
	FOUR = '4',
}

export enum HeterogeneousEnum {
	NO = 0,
	YES = 'YES',
}

export type ArrayDefinedStringEnumType = 'admin' | 'editor' | 'ghost';

export type ArrayDefinedNumericEnumType = 11 | 12 | 13;

@Entity()
export class EnumEntity {
	@PrimaryColumn()
	id: number;

	@Column({
		type: 'enum',
		enum: NumericEnum,
		default: NumericEnum.MODERATOR,
	})
	numericEnum: NumericEnum;

	@Column({
		type: 'enum',
		enum: StringEnum,
		default: StringEnum.GHOST,
	})
	stringEnum: StringEnum;

	@Column({
		type: 'enum',
		enum: StringNumericEnum,
		default: StringNumericEnum.FOUR,
	})
	stringNumericEnum: StringNumericEnum;

	@Column({
		type: 'enum',
		enum: HeterogeneousEnum,
		default: HeterogeneousEnum.NO,
	})
	heterogeneousEnum: HeterogeneousEnum;

	@Column({
		type: 'enum',
		enum: ['admin', 'editor', 'ghost'],
		default: 'ghost',
	})
	arrayDefinedStringEnum: ArrayDefinedStringEnumType;

	@Column({
		type: 'enum',
		enum: [11, 12, 13],
		default: 12,
	})
	arrayDefinedNumericEnum: ArrayDefinedNumericEnumType;

	@Column({
		type: 'enum',
		enum: StringEnum,
	})
	enumWithoutDefault: StringEnum;

	@Column({
		type: 'enum',
		enum: StringEnum,
		nullable: true,
		default: null,
	})
	nullableDefaultEnum: StringEnum;
}
