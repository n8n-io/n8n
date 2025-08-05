package main

import (
	"math"
	"testing"
)

func TestCalculatorAdd(t *testing.T) {
	calc := &Calculator{}

	tests := []struct {
		name string
		a, b float64
		want float64
	}{
		{"positive numbers", 2, 3, 5},
		{"negative numbers", -2, -3, -5},
		{"mixed", 10, -5, 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calc.Add(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("Add(%v, %v) = %v; want %v", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestCalculatorMultiply(t *testing.T) {
	calc := &Calculator{}

	got := calc.Multiply(3, 4)
	want := 12.0

	if got != want {
		t.Errorf("Multiply(3, 4) = %v; want %v", got, want)
	}
}

func TestCalculatorDivide(t *testing.T) {
	calc := &Calculator{}

	t.Run("normal division", func(t *testing.T) {
		got, err := calc.Divide(10, 2)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := 5.0
		if got != want {
			t.Errorf("Divide(10, 2) = %v; want %v", got, want)
		}
	})

	t.Run("division by zero", func(t *testing.T) {
		_, err := calc.Divide(10, 0)
		if err == nil {
			t.Error("expected error for division by zero")
		}
	})
}

func TestCalculatorPower(t *testing.T) {
	calc := &Calculator{}

	tests := []struct {
		name string
		a, b float64
		want float64
	}{
		{"2^3", 2, 3, 8},
		{"5^2", 5, 2, 25},
		{"10^0", 10, 0, 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calc.Power(tt.a, tt.b)
			want := math.Pow(tt.a, tt.b)
			if got != want {
				t.Errorf("Power(%v, %v) = %v; want %v", tt.a, tt.b, got, want)
			}
		})
	}
}
