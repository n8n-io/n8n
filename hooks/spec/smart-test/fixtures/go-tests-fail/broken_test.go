package testproject

import "testing"

func TestDivide(t *testing.T) {
	result := Divide(10, 2)
	if result != 5 {
		t.Errorf("Divide(10, 2) = %d; want 5", result)
	}
}
