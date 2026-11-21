#!/usr/bin/env python3
"""Prioritize product assumptions and suggest validation tests."""

import argparse
import csv
from dataclasses import dataclass


@dataclass
class Assumption:
    statement: str
    category: str
    risk: float
    certainty: float

    @property
    def priority_score(self) -> float:
        # High-risk, low-certainty assumptions should be tested first.
        return self.risk * (1.0 - self.certainty)


def parse_float(value: str, field: str) -> float:
    number = float(value)
    if number < 0 or number > 1:
        raise ValueError(f"{field} must be in [0, 1]")
    return number


def suggest_test(category: str) -> str:
    category = category.lower().strip()
    if category == "desirability":
        return "problem interviews or fake-door test"
    if category == "viability":
        return "pricing/willingness-to-pay test"
    if category == "feasibility":
        return "technical spike or architecture prototype"
    if category == "usability":
        return "moderated usability test"
    return "smallest possible experiment with clear success criteria"


def load_from_csv(path: str) -> list[Assumption]:
    assumptions: list[Assumption] = []
    with open(path, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"assumption", "category", "risk", "certainty"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            missing_str = ", ".join(sorted(missing))
            raise ValueError(f"Missing required columns: {missing_str}")

        for row in reader:
            assumptions.append(
                Assumption(
                    statement=(row.get("assumption") or "").strip(),
                    category=(row.get("category") or "").strip(),
                    risk=parse_float(row.get("risk") or "0", "risk"),
                    certainty=parse_float(row.get("certainty") or "0", "certainty"),
                )
            )
    return assumptions


def parse_inline(items: list[str]) -> list[Assumption]:
    assumptions: list[Assumption] = []
    for item in items:
        # format: statement|category|risk|certainty
        parts = [part.strip() for part in item.split("|")]
        if len(parts) != 4:
            raise ValueError("Inline assumption must be: statement|category|risk|certainty")
        assumptions.append(
            Assumption(
                statement=parts[0],
                category=parts[1],
                risk=parse_float(parts[2], "risk"),
                certainty=parse_float(parts[3], "certainty"),
            )
        )
    return assumptions


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Prioritize assumptions and generate test plan.")
    parser.add_argument("input", nargs="?", help="CSV file path")
    parser.add_argument(
        "--assumption",
        action="append",
        default=[],
        help="Inline assumption: statement|category|risk|certainty",
    )
    parser.add_argument("--top", type=int, default=10, help="Maximum assumptions to print")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    assumptions: list[Assumption] = []
    if args.input:
        assumptions.extend(load_from_csv(args.input))
    if args.assumption:
        assumptions.extend(parse_inline(args.assumption))

    if not assumptions:
        parser.error("Provide a CSV input file or at least one --assumption value.")

    assumptions.sort(key=lambda item: item.priority_score, reverse=True)

    print("prioritized_assumption_test_plan")
    print("rank,priority_score,category,risk,certainty,test,assumption")
    for rank, item in enumerate(assumptions[: args.top], start=1):
        test = suggest_test(item.category)
        print(
            f"{rank},{item.priority_score:.4f},{item.category},{item.risk:.2f},"
            f"{item.certainty:.2f},{test},{item.statement}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
