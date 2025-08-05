package models

import (
	"fmt"
	"strings"
	"time"
)

// User represents a user in the system
type User struct {
	ID        int
	Name      string
	Email     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewUser creates a new user with current timestamps
func NewUser(id int, name, email string) *User {
	now := time.Now()
	return &User{
		ID:        id,
		Name:      name,
		Email:     email,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// String returns a string representation of the user
func (u *User) String() string {
	return fmt.Sprintf("User{ID: %d, Name: %s, Email: %s}", u.ID, u.Name, u.Email)
}

// Validate checks if the user data is valid
func (u *User) Validate() error {
	if u.ID <= 0 {
		return fmt.Errorf("invalid user ID: %d", u.ID)
	}

	if u.Name == "" {
		return fmt.Errorf("user name cannot be empty")
	}

	if u.Email == "" {
		return fmt.Errorf("user email cannot be empty")
	}

	if !strings.Contains(u.Email, "@") {
		return fmt.Errorf("invalid email format: %s", u.Email)
	}

	return nil
}

// UpdateEmail updates the user's email and timestamp
func (u *User) UpdateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email cannot be empty")
	}

	if !strings.Contains(email, "@") {
		return fmt.Errorf("invalid email format: %s", email)
	}

	u.Email = email
	u.UpdatedAt = time.Now()
	return nil
}
