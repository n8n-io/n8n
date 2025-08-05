package models

import (
	"strings"
	"testing"
	"time"
)

func TestNewUser(t *testing.T) {
	id := 1
	name := "John Doe"
	email := "john@example.com"

	user := NewUser(id, name, email)

	if user.ID != id {
		t.Errorf("expected ID %d, got %d", id, user.ID)
	}

	if user.Name != name {
		t.Errorf("expected Name %s, got %s", name, user.Name)
	}

	if user.Email != email {
		t.Errorf("expected Email %s, got %s", email, user.Email)
	}

	if user.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}

	if user.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set")
	}

	if !user.CreatedAt.Equal(user.UpdatedAt) {
		t.Error("expected CreatedAt and UpdatedAt to be equal for new user")
	}
}

func TestUserString(t *testing.T) {
	user := &User{
		ID:    42,
		Name:  "Jane Smith",
		Email: "jane@example.com",
	}

	str := user.String()

	if !strings.Contains(str, "42") {
		t.Errorf("expected string to contain ID, got %s", str)
	}

	if !strings.Contains(str, "Jane Smith") {
		t.Errorf("expected string to contain name, got %s", str)
	}

	if !strings.Contains(str, "jane@example.com") {
		t.Errorf("expected string to contain email, got %s", str)
	}
}

func TestUserValidate(t *testing.T) {
	tests := []struct {
		name    string
		user    *User
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid user",
			user:    &User{ID: 1, Name: "John", Email: "john@example.com"},
			wantErr: false,
		},
		{
			name:    "invalid ID",
			user:    &User{ID: 0, Name: "John", Email: "john@example.com"},
			wantErr: true,
			errMsg:  "invalid user ID",
		},
		{
			name:    "negative ID",
			user:    &User{ID: -1, Name: "John", Email: "john@example.com"},
			wantErr: true,
			errMsg:  "invalid user ID",
		},
		{
			name:    "empty name",
			user:    &User{ID: 1, Name: "", Email: "john@example.com"},
			wantErr: true,
			errMsg:  "name cannot be empty",
		},
		{
			name:    "empty email",
			user:    &User{ID: 1, Name: "John", Email: ""},
			wantErr: true,
			errMsg:  "email cannot be empty",
		},
		{
			name:    "invalid email format",
			user:    &User{ID: 1, Name: "John", Email: "invalid-email"},
			wantErr: true,
			errMsg:  "invalid email format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.user.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("Validate() error = %v, want error containing %v", err, tt.errMsg)
			}
		})
	}
}

func TestUserUpdateEmail(t *testing.T) {
	t.Run("valid email update", func(t *testing.T) {
		user := &User{
			ID:        1,
			Name:      "John",
			Email:     "old@example.com",
			UpdatedAt: time.Now().Add(-1 * time.Hour),
		}

		oldUpdatedAt := user.UpdatedAt
		newEmail := "new@example.com"

		err := user.UpdateEmail(newEmail)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if user.Email != newEmail {
			t.Errorf("expected email %s, got %s", newEmail, user.Email)
		}

		if !user.UpdatedAt.After(oldUpdatedAt) {
			t.Error("expected UpdatedAt to be updated")
		}
	})

	t.Run("empty email", func(t *testing.T) {
		user := &User{ID: 1, Name: "John", Email: "old@example.com"}

		err := user.UpdateEmail("")
		if err == nil {
			t.Error("expected error for empty email")
		}

		if user.Email != "old@example.com" {
			t.Error("email should not have changed on error")
		}
	})

	t.Run("invalid email format", func(t *testing.T) {
		user := &User{ID: 1, Name: "John", Email: "old@example.com"}

		err := user.UpdateEmail("invalid-email")
		if err == nil {
			t.Error("expected error for invalid email")
		}

		if user.Email != "old@example.com" {
			t.Error("email should not have changed on error")
		}
	})
}
