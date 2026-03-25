interface Iban {
    alpha: string[];
    formats: Array<{
        bban: Array<{
            type: string;
            count: number;
        }>;
        country: string;
        format?: string;
        total?: number;
    }>;
    iso3166: string[];
    mod97: (digitStr: string) => number;
    pattern10: string[];
    pattern100: string[];
    toDigitString: (str: string) => string;
}
declare const iban: Iban;
export default iban;
