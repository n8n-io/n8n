import toNumber from "../strnum.js";

describe("Should convert all the valid numeric strings to number", () => {
  it("should return infinity as per user option", () => {
    expect(toNumber("1e1000", { infinity: "original" })).toEqual("1e1000");
    expect(toNumber("1e1000", { infinity: "null" })).toEqual(null);
    expect(toNumber("1e1000", { infinity: "infinity" })).toEqual(Infinity);
    expect(toNumber("1e1000", { infinity: "string" })).toEqual("Infinity");
    expect(toNumber("-1e1000", { infinity: "original" })).toEqual("-1e1000");
    expect(toNumber("-1e1000", { infinity: "null" })).toEqual(null);
    expect(toNumber("-1e1000", { infinity: "infinity" })).toEqual(-Infinity);
    expect(toNumber("-1e1000", { infinity: "string" })).toEqual("-Infinity");


    expect(toNumber("1e309")).toEqual("1e309");

  });
});