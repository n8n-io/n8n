interface NumberOptions {
    min?: number;
    max?: number;
    precision?: number;
}
interface FakeString {
    email(options?: {
        provider?: string;
        domain?: string;
    }): string;
    userName(): string;
    firstName(): string;
    lastName(): string;
    fullName(): string;
    uuid(): string;
    string(options?: {
        length?: number;
    }): string;
}
interface FakeDate {
    past(): Date;
    future(): Date;
}
interface FakeAddress {
    city(): string;
    country(): string;
    zipCode(): string;
    street(): string;
}
interface FakeNumber {
    integer(options?: Omit<NumberOptions, 'precision'>): number;
    float(options: NumberOptions): number;
}
export interface Faker {
    address: FakeAddress;
    date: FakeDate;
    number: FakeNumber;
    string: FakeString;
}
export declare function createFaker(): Faker;
export {};
//# sourceMappingURL=faker.d.ts.map