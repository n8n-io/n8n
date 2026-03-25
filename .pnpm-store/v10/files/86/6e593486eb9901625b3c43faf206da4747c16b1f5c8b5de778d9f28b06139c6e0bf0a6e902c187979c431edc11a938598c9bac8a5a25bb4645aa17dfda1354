export function printBytes(bytes) {
    return [...bytes].map((n) => {
        const pad = (num) => ("0".repeat(8) + num.toString(2)).slice(-8);
        const b = pad(n);
        const [maj, min] = [b.slice(0, 3), b.slice(3)];
        let dmaj = "";
        switch (maj) {
            case "000":
                dmaj = "0 - Uint64";
                break;
            case "001":
                dmaj = "1 - Neg Uint64";
                break;
            case "010":
                dmaj = "2 - unstructured bytestring";
                break;
            case "011":
                dmaj = "3 - utf8 string";
                break;
            case "100":
                dmaj = "4 - list";
                break;
            case "101":
                dmaj = "5 - map";
                break;
            case "110":
                dmaj = "6 - tag";
                break;
            case "111":
                dmaj = "7 - special";
                break;
            default:
                dmaj = String(parseInt(maj, 2));
        }
        return `${maj}_${min} (${dmaj}, ${parseInt(min, 2)})`;
    });
}
