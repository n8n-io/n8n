package main

import "testing"

func TestAdd(t *testing.T) {
	tests := []struct {
		name string
		a, b int
		want int
	}{
		{"positive numbers", 2, 3, 5},
		{"negative numbers", -2, -3, -5},
		{"mixed numbers", -2, 3, 1},
		{"zero", 0, 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Add(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestMultiply(t *testing.T) {
	tests := []struct {
		name string
		a, b int
		want int
	}{
		{"positive numbers", 2, 3, 6},
		{"negative numbers", -2, -3, 6},
		{"with zero", 5, 0, 0},
		{"identity", 7, 1, 7},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Multiply(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("Multiply(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}
